import PageMeta from '@/components/PageMeta';
import FondsGrundlagenInfographic from '@/components/fondsGrundlagen/FondsGrundlagenInfographic';

/** Public educational page — /fonds-grundlagen */
const FondsGrundlagen = () => (
  <>
    <PageMeta
      title="Fonds-Grundlagen — Kapitalmitte Spezial-AIF"
      description="Infografik: Ablauf, Allokation, Risikosteuerung, Renditebausteine, Eignung, Vergleich und rechtliche Hinweise zum Kapitalmitte Spezial-AIF."
      path="/fonds-grundlagen"
    />
    <FondsGrundlagenInfographic />
  </>
);

export default FondsGrundlagen;
