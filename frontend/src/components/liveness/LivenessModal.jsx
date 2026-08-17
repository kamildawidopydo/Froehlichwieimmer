import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { CheckCircle2, AlertTriangle, Camera, RefreshCcw } from 'lucide-react';

const LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380];

const CHALLENGE_LABELS = {
  straight: 'Schauen Sie geradeaus',
  left: 'Schauen Sie nach links',
  right: 'Schauen Sie nach rechts',
  up: 'Schauen Sie nach oben',
  down: 'Schauen Sie nach unten',
  blink: 'Zwinkern Sie',
};

const MAX_ATTEMPTS = 3;
const STEP_TIMEOUT_MS = 12000;
const HOLD_MS = 650;
const STEP_TRANSITION_PAUSE_MS = 900;
const DOCUMENT_STEP_TIMEOUT_MS = 22000;
const DOCUMENT_HOLD_MS = 900;
const BACK_SIDE_MIN_OBSERVE_MS = 2200;
const BACK_SIDE_MIN_ROTATION_WINDOW_MS = 900;

const DOCUMENT_TASKS = [
  { id: 'front', label: 'Bitte halten Sie Ihren Ausweis gut sichtbar vor die Kamera.' },
  { id: 'tilt_lr', label: 'Kippen Sie den Ausweis leicht nach links und rechts.' },
  { id: 'back_side', label: 'Bitte zeigen Sie nun die Rückseite Ihres Ausweises.' },
  { id: 'near_camera', label: 'Halten Sie den Ausweis näher an die Kamera.' },
];

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const getEyeAspectRatio = (landmarks, indices) => {
  const [p1, p2, p3, p4, p5, p6] = indices.map((index) => landmarks[index]);
  const verticalA = distance(p2, p6);
  const verticalB = distance(p3, p5);
  const horizontal = distance(p1, p4) || 1e-6;
  return (verticalA + verticalB) / (2 * horizontal);
};

const getHeadPose = (landmarks) => {
  const leftEyeOuter = landmarks[33];
  const rightEyeOuter = landmarks[263];
  const noseTip = landmarks[1];
  const eyeMidpoint = {
    x: (leftEyeOuter.x + rightEyeOuter.x) / 2,
    y: (leftEyeOuter.y + rightEyeOuter.y) / 2,
  };
  const eyeDistance = Math.abs(rightEyeOuter.x - leftEyeOuter.x) || 1e-6;

  return {
    yaw: (noseTip.x - eyeMidpoint.x) / eyeDistance,
    pitch: (noseTip.y - eyeMidpoint.y) / eyeDistance,
  };
};

const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const buildFairChallenges = () => {
  const targetLength = Math.random() < 0.5 ? 4 : 5;
  const horizontal = shuffle(['left', 'right'])[0];
  const vertical = shuffle(['up', 'down'])[0];
  const required = ['straight', horizontal, vertical, 'blink'];
  const optional = ['left', 'right', 'up', 'down', 'blink'].filter((item) => !required.includes(item));

  while (required.length < targetLength && optional.length) {
    required.push(optional.shift());
  }

  const [first, ...rest] = required;
  return [first, ...shuffle(rest)];
};

const createInitialRunState = (documentTaskMode) => ({
  documentTaskMode,
  documentTasks: documentTaskMode ? [...DOCUMENT_TASKS] : [],
  documentTaskIndex: 0,
  challenges: buildFairChallenges(),
  stepIndex: 0,
  stepStartedAt: performance.now(),
  holdStartedAt: 0,
  blinkClosed: false,
  passportScore: 0,
  passportStrengthBaseline: 0,
  passportHiddenAt: 0,
  documentTaskHoldStartedAt: 0,
  passportCenterMin: 1,
  passportCenterMax: 0,
  neutral: { yaw: 0, pitch: 0, ear: 0.28 },
  calibrationSamples: [],
  backSideStrengthMin: 1,
  backSideStrengthMax: 0,
  backSideStartedAt: 0,
  stepUnlockedAt: performance.now() + STEP_TRANSITION_PAUSE_MS,
  challengePrimed: true,
});

const detectPassportInGuide = (video, canvas) => {
  if (!video?.videoWidth || !video?.videoHeight || !canvas) {
    return {
      visible: false,
      edgeRatio: 0,
      stdDev: 0,
      centerX: 0.5,
      strength: 0,
    };
  }

  const width = 224;
  const height = 224;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return {
      visible: false,
      edgeRatio: 0,
      stdDev: 0,
      centerX: 0.5,
      strength: 0,
    };
  }

  ctx.drawImage(video, 0, 0, width, height);
  const candidateRois = [
    // Display guide area (right side for mirrored preview).
    {
      x: Math.floor(width * 0.53),
      y: Math.floor(height * 0.2),
      w: Math.floor(width * 0.42),
      h: Math.floor(height * 0.62),
    },
    // Mirrored camera/content mismatch fallback.
    {
      x: Math.floor(width * 0.05),
      y: Math.floor(height * 0.2),
      w: Math.floor(width * 0.42),
      h: Math.floor(height * 0.62),
    },
    // Wider fallback area for real-world hand placement variance.
    {
      x: Math.floor(width * 0.2),
      y: Math.floor(height * 0.18),
      w: Math.floor(width * 0.6),
      h: Math.floor(height * 0.66),
    },
  ];

  const analyzeRoi = (roi) => {
    const imageData = ctx.getImageData(roi.x, roi.y, roi.w, roi.h).data;
    let sum = 0;
    let sumSq = 0;
    let edgeCount = 0;
    let totalSamples = 0;
    let weightedX = 0;
    let weightTotal = 0;

    const getLumaAt = (x, y) => {
      const idx = (y * roi.w + x) * 4;
      const r = imageData[idx];
      const g = imageData[idx + 1];
      const b = imageData[idx + 2];
      return 0.299 * r + 0.587 * g + 0.114 * b;
    };

    for (let y = 0; y < roi.h - 1; y += 1) {
      for (let x = 0; x < roi.w - 1; x += 1) {
        const luma = getLumaAt(x, y);
        const right = getLumaAt(x + 1, y);
        const down = getLumaAt(x, y + 1);
        const gradient = Math.abs(luma - right) + Math.abs(luma - down);
        if (gradient > 32) edgeCount += 1;
        if (gradient > 20) {
          weightedX += x * gradient;
          weightTotal += gradient;
        }
        sum += luma;
        sumSq += luma * luma;
        totalSamples += 1;
      }
    }

    if (!totalSamples) {
      return {
        visible: false,
        edgeRatio: 0,
        stdDev: 0,
        centerX: 0.5,
        strength: 0,
      };
    }

    const mean = sum / totalSamples;
    const variance = Math.max(sumSq / totalSamples - mean * mean, 0);
    const stdDev = Math.sqrt(variance);
    const edgeRatio = edgeCount / totalSamples;
    const localCenterX = weightTotal ? weightedX / weightTotal / roi.w : 0.5;
    const centerX = (roi.x + localCenterX * roi.w) / width;
    const visible = stdDev > 12 && edgeRatio > 0.055;
    const strength = edgeRatio * (stdDev / 40);

    return {
      visible,
      edgeRatio,
      stdDev,
      centerX,
      strength,
    };
  };

  const best = candidateRois
    .map((roi) => analyzeRoi(roi))
    .sort((a, b) => b.strength - a.strength)[0];

  return best;
};

const LivenessModal = ({
  isOpen,
  onClose,
  onLivenessSuccess,
  passportDocument,
  documentTaskMode = false,
}) => {
  const videoRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const runStateRef = useRef(createInitialRunState(documentTaskMode));
  const analysisCanvasRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [cameraError, setCameraError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [instruction, setInstruction] = useState(CHALLENGE_LABELS.straight);
  const [feedback, setFeedback] = useState('Bitte Gesicht mittig halten und der Anweisung folgen.');
  const [isPositiveFeedback, setIsPositiveFeedback] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const [passportVisible, setPassportVisible] = useState(false);
  const [documentTaskText, setDocumentTaskText] = useState('');

  const getActiveInstruction = useCallback((state) => {
    if (state.documentTaskMode && state.documentTaskIndex < state.documentTasks.length) {
      return state.documentTasks[state.documentTaskIndex].label;
    }
    return CHALLENGE_LABELS[state.challenges[state.stepIndex]];
  }, []);

  const progressText = useMemo(() => {
    const state = runStateRef.current;
    const total = state.challenges.length + (state.documentTaskMode ? state.documentTasks.length : 0);
    const completed = state.stepIndex + (state.documentTaskMode ? state.documentTaskIndex : 0);
    return `Schritt ${Math.min(completed + 1, total)} / ${total}`;
  }, [instruction, documentTaskText]);

  const closeAndCleanup = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    lastVideoTimeRef.current = -1;
  }, []);

  const setNewRun = useCallback((attemptCount = 0) => {
    runStateRef.current = createInitialRunState(documentTaskMode);
    const firstInstruction = getActiveInstruction(runStateRef.current);
    setInstruction(firstInstruction);
    setFeedback('Bitte folgen Sie der Anweisung.');
    setIsPositiveFeedback(false);
    setCameraError('');
    setCanRetry(false);
    setPassportVisible(false);
    setDocumentTaskText(
      runStateRef.current.documentTaskMode
        ? `Dokumentaufgabe 1 / ${runStateRef.current.documentTasks.length}`
        : '',
    );
    setAttempts(attemptCount);
  }, [documentTaskMode, getActiveInstruction]);

  const evaluateChallenge = useCallback((challenge, metrics, state) => {
    const yawDelta = metrics.pose.yaw - state.neutral.yaw;
    const pitchDelta = metrics.pose.pitch - state.neutral.pitch;
    const earDrop = state.neutral.ear - metrics.ear;

    switch (challenge) {
      case 'straight':
        return Math.abs(yawDelta) < 0.06 && Math.abs(pitchDelta) < 0.06;
      case 'left':
        // Mirror/user orientation alignment: user turning left maps to positive yaw delta here.
        return yawDelta > 0.1;
      case 'right':
        // Mirror/user orientation alignment: user turning right maps to negative yaw delta here.
        return yawDelta < -0.1;
      case 'up':
        return pitchDelta < -0.08;
      case 'down':
        return pitchDelta > 0.08;
      case 'blink': {
        if (!state.blinkClosed && earDrop > 0.07) state.blinkClosed = true;
        if (state.blinkClosed && earDrop < 0.03) return true;
        return false;
      }
      default:
        return false;
    }
  }, []);

  const evaluateDocumentTask = useCallback((task, state, passportMetrics, now) => {
    if (!task) return false;
    const hasPassport = passportMetrics.visible;

    const ensureHold = () => {
      if (!state.documentTaskHoldStartedAt) state.documentTaskHoldStartedAt = now;
      return now - state.documentTaskHoldStartedAt >= DOCUMENT_HOLD_MS;
    };

    const resetHold = () => {
      state.documentTaskHoldStartedAt = 0;
    };

    switch (task.id) {
      case 'front':
        if (!hasPassport) {
          resetHold();
          return false;
        }
        if (ensureHold()) {
          state.passportStrengthBaseline = Math.max(passportMetrics.strength, 0.05);
          resetHold();
          return true;
        }
        return false;
      case 'tilt_lr':
        if (!hasPassport || !passportMetrics.visible) {
          resetHold();
          state.passportCenterMin = 1;
          state.passportCenterMax = 0;
          return false;
        }
        state.passportCenterMin = Math.min(state.passportCenterMin, passportMetrics.centerX);
        state.passportCenterMax = Math.max(state.passportCenterMax, passportMetrics.centerX);
        if (state.passportCenterMax - state.passportCenterMin > 0.08 && ensureHold()) {
          state.passportCenterMin = 1;
          state.passportCenterMax = 0;
          resetHold();
          return true;
        }
        return false;
      case 'back_side':
        if (!state.backSideStartedAt) {
          state.backSideStartedAt = now;
        }

        if (!hasPassport) {
          resetHold();
          return false;
        }

        state.backSideStrengthMin = Math.min(state.backSideStrengthMin, passportMetrics.strength);
        state.backSideStrengthMax = Math.max(state.backSideStrengthMax, passportMetrics.strength);
        const baseline = state.passportStrengthBaseline || 0.05;
        const strengthSwing = state.backSideStrengthMax - state.backSideStrengthMin;
        const baselineDiff = Math.abs(passportMetrics.strength - baseline);
        const observedForMs = now - state.backSideStartedAt;
        const rotatedSignalAt = state.backSideStartedAt + BACK_SIDE_MIN_ROTATION_WINDOW_MS;
        const likelyFlipped = observedForMs >= BACK_SIDE_MIN_OBSERVE_MS
          && now >= rotatedSignalAt
          && (strengthSwing > 0.06 || baselineDiff > 0.05);

        if (likelyFlipped && ensureHold()) {
          state.backSideStrengthMin = 1;
          state.backSideStrengthMax = 0;
          state.backSideStartedAt = 0;
          resetHold();
          return true;
        }
        if (observedForMs < BACK_SIDE_MIN_OBSERVE_MS) {
          resetHold();
        }
        return false;
      case 'near_camera': {
        if (!hasPassport) {
          resetHold();
          return false;
        }
        const baseline = state.passportStrengthBaseline || 0.05;
        const isNear = passportMetrics.strength > baseline * 1.08 || passportMetrics.stdDev > 22;
        if (isNear && ensureHold()) {
          resetHold();
          return true;
        }
        if (!isNear) resetHold();
        return false;
      }
      default:
        return false;
    }
  }, []);

  const failAttempt = useCallback((message) => {
    setAttempts((prev) => {
      const next = prev + 1;

      const state = runStateRef.current;
      const now = performance.now();
      state.stepStartedAt = now;
      state.holdStartedAt = 0;
      state.blinkClosed = false;
      state.documentTaskHoldStartedAt = 0;
      state.passportHiddenAt = 0;
      state.passportScore = 0;
      state.passportCenterMin = 1;
      state.passportCenterMax = 0;
      state.backSideStrengthMin = 1;
      state.backSideStrengthMax = 0;
      state.stepUnlockedAt = now + STEP_TRANSITION_PAUSE_MS;
      state.challengePrimed = state.stepIndex === 0;

      setInstruction(getActiveInstruction(state));
      setIsPositiveFeedback(false);
      setPassportVisible(false);
      setCanRetry(false);
      setCameraError('');
      setFeedback(`${message} Wir machen mit der aktuellen Aufgabe weiter.`);
      return next;
    });
  }, [getActiveInstruction]);

  const detectionLoop = useCallback(() => {
    const video = videoRef.current;
    const faceLandmarker = faceLandmarkerRef.current;
    if (!video || !faceLandmarker) return;

    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      const now = performance.now();
      const state = runStateRef.current;
      const result = faceLandmarker.detectForVideo(video, now);
      const analysisCanvas = analysisCanvasRef.current;
      const passportMetrics = detectPassportInGuide(video, analysisCanvas);
      state.passportScore = passportMetrics.visible
        ? Math.min(1, state.passportScore + 0.18)
        : Math.max(0, state.passportScore - 0.06);
      const hasPassportInFrame = state.passportScore >= 0.38;
      setPassportVisible(hasPassportInFrame);

      if (!result.faceLandmarks?.length) {
        setIsPositiveFeedback(false);
        setFeedback('Kein Gesicht erkannt. Bitte Kamera ausrichten.');
        if (now - state.stepStartedAt > STEP_TIMEOUT_MS) {
          failAttempt('Zeit abgelaufen. Bitte erneut versuchen.');
          return;
        }
      } else {
        const landmarks = result.faceLandmarks[0];
        const earLeft = getEyeAspectRatio(landmarks, LEFT_EYE_INDICES);
        const earRight = getEyeAspectRatio(landmarks, RIGHT_EYE_INDICES);
        const metrics = {
          pose: getHeadPose(landmarks),
          ear: (earLeft + earRight) / 2,
        };

        if (state.documentTaskMode && state.documentTaskIndex < state.documentTasks.length) {
          const activeDocumentTask = state.documentTasks[state.documentTaskIndex];
          setDocumentTaskText(
            `Dokumentaufgabe ${state.documentTaskIndex + 1} / ${state.documentTasks.length}`,
          );
          if (!hasPassportInFrame) {
            setIsPositiveFeedback(false);
            setFeedback('Bitte Ausweis im markierten Bereich sichtbar halten.');
            if (now - state.stepStartedAt > DOCUMENT_STEP_TIMEOUT_MS) {
              failAttempt('Dokumentaufgabe nicht rechtzeitig erfüllt.');
              return;
            }
            rafRef.current = requestAnimationFrame(detectionLoop);
            return;
          }

          const documentTaskDone = evaluateDocumentTask(
            activeDocumentTask,
            state,
            {
              ...passportMetrics,
              // Use raw frame visibility for task validation to avoid
              // passing tasks when the card just left the frame.
              visible: passportMetrics.visible,
            },
            now,
          );

          if (documentTaskDone) {
            state.documentTaskIndex += 1;
            state.stepStartedAt = now;
            if (state.documentTaskIndex >= state.documentTasks.length) {
              setDocumentTaskText('Dokumentaufgaben abgeschlossen');
              const nextInstruction = CHALLENGE_LABELS[state.challenges[state.stepIndex]];
              state.stepUnlockedAt = now + STEP_TRANSITION_PAUSE_MS;
              state.challengePrimed = state.challenges[state.stepIndex] === 'straight';
              setInstruction(nextInstruction);
              setFeedback(`Sehr gut! Jetzt: ${nextInstruction}`);
            } else {
              const nextDocTask = state.documentTasks[state.documentTaskIndex];
              setInstruction(nextDocTask.label);
              setFeedback(`Sehr gut! Nächste Aufgabe: ${nextDocTask.label}`);
            }
            rafRef.current = requestAnimationFrame(detectionLoop);
            return;
          }

          setInstruction(activeDocumentTask.label);
          setIsPositiveFeedback(false);
          if (activeDocumentTask.id === 'back_side') {
            setFeedback('Bitte drehen Sie den Ausweis langsam auf die Rückseite und halten Sie ihn kurz ruhig.');
          } else {
            setFeedback('Bitte folgen Sie der Ausweisanweisung.');
          }
          if (now - state.stepStartedAt > DOCUMENT_STEP_TIMEOUT_MS) {
            failAttempt('Dokumentaufgabe nicht rechtzeitig erfüllt.');
            return;
          }
          rafRef.current = requestAnimationFrame(detectionLoop);
          return;
        }

        const activeChallenge = state.challenges[state.stepIndex];

        if (now < state.stepUnlockedAt) {
          setIsPositiveFeedback(false);
          setFeedback('Nächste Aufgabe wird vorbereitet. Bitte kurz warten.');
          rafRef.current = requestAnimationFrame(detectionLoop);
          return;
        }

        if (activeChallenge === 'straight' && state.calibrationSamples.length < 18) {
          state.calibrationSamples.push({
            yaw: metrics.pose.yaw,
            pitch: metrics.pose.pitch,
            ear: metrics.ear,
          });
          const totals = state.calibrationSamples.reduce(
            (acc, sample) => ({
              yaw: acc.yaw + sample.yaw,
              pitch: acc.pitch + sample.pitch,
              ear: acc.ear + sample.ear,
            }),
            { yaw: 0, pitch: 0, ear: 0 },
          );
          state.neutral = {
            yaw: totals.yaw / state.calibrationSamples.length,
            pitch: totals.pitch / state.calibrationSamples.length,
            ear: totals.ear / state.calibrationSamples.length,
          };
        }

        if (!hasPassportInFrame) {
          state.holdStartedAt = 0;
          setIsPositiveFeedback(false);
          setFeedback('Bitte Reisepass im markierten Bereich sichtbar halten.');
          if (now - state.stepStartedAt > STEP_TIMEOUT_MS) {
            failAttempt('Reisepass wurde nicht stabil erkannt.');
            return;
          }
          rafRef.current = requestAnimationFrame(detectionLoop);
          return;
        }

        const isMet = evaluateChallenge(activeChallenge, metrics, state);
        if (!state.challengePrimed) {
          if (!isMet) {
            state.challengePrimed = true;
          }
          setIsPositiveFeedback(false);
          setFeedback('Bitte führen Sie die nächste Bewegung jetzt aus.');
          if (now - state.stepStartedAt > STEP_TIMEOUT_MS) {
            failAttempt('Schritt nicht rechtzeitig erfüllt.');
            return;
          }
          rafRef.current = requestAnimationFrame(detectionLoop);
          return;
        }

        if (isMet) {
          setIsPositiveFeedback(true);
          if (!state.holdStartedAt) state.holdStartedAt = now;

          if (activeChallenge === 'blink' || now - state.holdStartedAt >= HOLD_MS) {
            state.stepIndex += 1;
            state.stepStartedAt = now;
            state.holdStartedAt = 0;
            state.blinkClosed = false;

            if (state.stepIndex >= state.challenges.length) {
              setFeedback('Prüfung erfolgreich abgeschlossen.');
              closeAndCleanup();
              onLivenessSuccess();
              return;
            }

            const nextChallenge = state.challenges[state.stepIndex];
            state.stepUnlockedAt = now + STEP_TRANSITION_PAUSE_MS;
            state.challengePrimed = nextChallenge === 'straight';
            setInstruction(CHALLENGE_LABELS[nextChallenge]);
            setFeedback(`Sehr gut! Jetzt: ${CHALLENGE_LABELS[nextChallenge]}`);
          } else {
            setFeedback('Sehr gut! Bitte kurz halten.');
          }
        } else {
          state.holdStartedAt = 0;
          setIsPositiveFeedback(false);
          setFeedback('Bitte folgen Sie der Anweisung.');
          if (now - state.stepStartedAt > STEP_TIMEOUT_MS) {
            failAttempt('Schritt nicht rechtzeitig erfüllt.');
            return;
          }
        }
      }
    }

    rafRef.current = requestAnimationFrame(detectionLoop);
  }, [closeAndCleanup, evaluateChallenge, evaluateDocumentTask, failAttempt, onLivenessSuccess]);

  const initAndStart = useCallback(async () => {
    setLoading(true);
    setCameraError('');
    setCanRetry(false);
    setNewRun(0);

    try {
      if (!faceLandmarkerRef.current) {
        const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      }

      if (!analysisCanvasRef.current) {
        analysisCanvasRef.current = document.createElement('canvas');
      }

      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      await video.play();
      setLoading(false);
      rafRef.current = requestAnimationFrame(detectionLoop);
    } catch (err) {
      setLoading(false);
      setIsPositiveFeedback(false);
      setCameraError('Kamera konnte nicht gestartet werden. Bitte Berechtigung prüfen.');
      setFeedback('Bitte Kamera-Zugriff erlauben und erneut versuchen.');
      setCanRetry(true);
      closeAndCleanup();
    }
  }, [closeAndCleanup, detectionLoop, setNewRun]);

  useEffect(() => {
    if (!isOpen) {
      closeAndCleanup();
      return undefined;
    }

    initAndStart();
    const onEsc = (event) => {
      if (event.key === 'Escape') {
        closeAndCleanup();
        onClose();
      }
    };
    window.addEventListener('keydown', onEsc);

    return () => {
      window.removeEventListener('keydown', onEsc);
      closeAndCleanup();
    };
  }, [closeAndCleanup, initAndStart, isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/70 p-4 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="liveness-title"
      translate="no"
    >
      <div className="w-full max-w-3xl rounded-2xl border border-bank-border bg-white p-5 sm:p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="liveness-title" className="text-lg sm:text-xl font-semibold text-bank-text">
              Sicherheitsprüfung
            </h3>
            <p className="text-sm text-bank-text-muted mt-1">
              Bitte folgen Sie den Anweisungen. Die Verarbeitung läuft nur lokal im Browser.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              closeAndCleanup();
              onClose();
            }}
            className="rounded-lg border border-bank-border px-3 py-1.5 text-sm text-bank-text hover:bg-bank-bg"
          >
            Schließen
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-[3/4]">
            <video
              ref={videoRef}
              className={`absolute inset-0 h-full w-full object-cover scale-x-[-1] transition-opacity ${loading ? 'opacity-40' : 'opacity-100'}`}
              autoPlay
              playsInline
              muted
            />
            <div
              className={`pointer-events-none absolute inset-0 border-4 ${
                isPositiveFeedback ? 'border-emerald-500' : 'border-rose-500'
              }`}
            />
            <div
              className={`pointer-events-none absolute right-[5%] top-[20%] h-[62%] w-[42%] rounded-lg border-2 border-dashed ${
                passportVisible ? 'border-emerald-400' : 'border-amber-300'
              }`}
            />
            <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
              {progressText}
            </div>
            {documentTaskText && (
              <div className="absolute left-3 bottom-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                {documentTaskText}
              </div>
            )}
            <div className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
              {passportVisible ? 'Ausweis/Karte erkannt' : 'Ausweis/Karte zeigen'}
            </div>
            {loading && (
              <div className="absolute inset-0 grid place-items-center text-white text-sm">
                <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-2">
                  <Camera size={16} /> Kamera wird gestartet...
                </span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-bank-border bg-bank-bg p-3">
              <p className="text-xs uppercase tracking-wide text-bank-text-muted">Aktuelle Anweisung</p>
              <p className="mt-1 font-semibold text-bank-text">{instruction}</p>
            </div>
            <div
              className={`rounded-xl border p-3 ${
                isPositiveFeedback ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
              }`}
            >
              <p className="text-xs uppercase tracking-wide text-bank-text-muted">Live-Feedback</p>
              <p className="mt-1 text-bank-text">{feedback}</p>
            </div>
            <div className="rounded-xl border border-bank-border bg-white p-3 text-sm text-bank-text">
              Versuche: {attempts} ({MAX_ATTEMPTS}+ möglich)
            </div>
            <div className="rounded-xl border border-bank-border bg-white p-3 text-sm text-bank-text">
              {documentTaskMode
                ? 'Führen Sie zuerst die Ausweis-Aufgaben aus. Es reicht, wenn eine Karte im Bereich klar erkennbar ist.'
                : 'Bitte halten Sie Ihren Ausweis oder eine Karte im markierten Bereich und führen Sie die Kopfbewegungen gleichzeitig aus.'}
            </div>
            {passportDocument?.url && (
              <div className="rounded-xl border border-bank-border bg-bank-bg p-3">
                <p className="text-xs uppercase tracking-wide text-bank-text-muted">Hochgeladenes Ausweisdokument</p>
                <div className="mt-2 overflow-hidden rounded-lg border border-bank-border bg-white">
                  <img
                    src={passportDocument.url}
                    alt={passportDocument.name || 'Ausweisdokument'}
                    className="h-28 w-full object-cover"
                  />
                </div>
                <p className="mt-2 text-xs text-bank-text-muted">
                  Das gezeigte Dokument sollte dem hochgeladenen Dokument entsprechen.
                </p>
              </div>
            )}
            {cameraError && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}
            {canRetry && (
              <button
                type="button"
                onClick={() => initAndStart()}
                className="inline-flex items-center gap-2 rounded-xl bg-bank-ink px-4 py-2 text-sm text-white hover:bg-bank-ink-hover"
              >
                <RefreshCcw size={16} /> Erneut versuchen
              </button>
            )}
            <p className="text-xs text-bank-text-muted">
              Tipp: Gutes Licht, Gesicht vollständig sichtbar, Kamera möglichst auf Augenhöhe.
            </p>
            <p className="text-xs text-bank-text-muted inline-flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              Keine Uploads aus diesem Schritt: rein lokal im Browser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LivenessModal;
