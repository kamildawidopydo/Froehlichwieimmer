/**
 * react-router-dom-kompatible Brücke auf Basis von TanStack Router.
 * Das Originalprojekt nutzte react-router-dom v7 (Routes/Route/Outlet/...).
 * Diese Datei bildet exakt die genutzte API nach, damit alle 800+ Original-
 * dateien unverändert laufen. Navigation läuft vollständig über TanStack.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";

/* ------------------------------------------------------------------ */
/* Location & Navigation                                                */
/* ------------------------------------------------------------------ */

export function useLocation() {
  const loc = useRouterState({ select: (s) => s.location });
  return useMemo(
    () => ({
      pathname: loc.pathname,
      search: loc.searchStr ? (loc.searchStr.startsWith("?") ? loc.searchStr : `?${loc.searchStr}`) : "",
      hash: loc.hash ? `#${loc.hash}` : "",
      state: loc.state?.__rrState ?? null,
      key: loc.state?.__TSR_key ?? loc.state?.key ?? "default",
    }),
    [loc.pathname, loc.searchStr, loc.hash, loc.state],
  );
}

function resolveTo(to, basePath) {
  if (to == null) return basePath;
  if (typeof to === "object") {
    const p = to.pathname ?? basePath;
    let s = to.search ?? "";
    if (s && !s.startsWith("?")) s = `?${s}`;
    let h = to.hash ?? "";
    if (h && !h.startsWith("#")) h = `#${h}`;
    return resolveTo(p, basePath) + s + h;
  }
  const str = String(to);
  if (str.startsWith("/") || /^[a-z]+:/i.test(str)) return str;
  if (str.startsWith("?") || str.startsWith("#")) return basePath + str;
  const tail = str.match(/[?#].*$/)?.[0] ?? "";
  const rel = str.replace(/[?#].*$/, "");
  const parts = basePath.split("/").filter(Boolean);
  for (const seg of rel.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== "." && seg !== "") parts.push(seg);
  }
  return "/" + parts.join("/") + tail;
}

function useRouteBase() {
  const ctx = useContext(RouteContext);
  const { pathname } = useLocation();
  return ctx?.pathnameBase ?? pathname;
}

export function useNavigate() {
  const router = useRouter();
  const base = useRouteBase();
  return useCallback(
    (to, options = {}) => {
      if (typeof to === "number") {
        if (typeof window !== "undefined") window.history.go(to);
        return;
      }
      const href = resolveTo(to, base);
      if (/^[a-z]+:/i.test(href)) {
        window.location.href = href;
        return;
      }
      router.navigate({
        href,
        replace: !!options.replace,
        state: options.state !== undefined ? { __rrState: options.state } : undefined,
        resetScroll: options.preventScrollReset ? false : true,
      });
    },
    [router, base],
  );
}

export function useSearchParams() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const setSearchParams = useCallback(
    (next, options = {}) => {
      const value = typeof next === "function" ? next(new URLSearchParams(location.search)) : next;
      const sp = value instanceof URLSearchParams ? value : new URLSearchParams(value);
      const qs = sp.toString();
      navigate(`${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`, {
        replace: options.replace ?? false,
        preventScrollReset: options.preventScrollReset ?? true,
        state: options.state,
      });
    },
    [navigate, location.pathname, location.search, location.hash],
  );
  return [params, setSearchParams];
}

export function createSearchParams(init) {
  return new URLSearchParams(init);
}

export function useNavigationType() {
  return "PUSH";
}

/* ------------------------------------------------------------------ */
/* Links                                                                */
/* ------------------------------------------------------------------ */

function isModified(e) {
  return e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || e.button !== 0;
}

export const Link = React.forwardRef(function Link(
  { to, replace, state, reloadDocument, preventScrollReset, target, onClick, children, ...rest },
  ref,
) {
  const base = useRouteBase();
  const navigate = useNavigate();
  const href = resolveTo(to, base);
  const external = /^[a-z]+:/i.test(href);
  return (
    <a
      ref={ref}
      href={href}
      target={target}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || external || reloadDocument || isModified(e) || (target && target !== "_self")) return;
        e.preventDefault();
        navigate(href, { replace, state, preventScrollReset });
      }}
    >
      {children}
    </a>
  );
});

export const NavLink = React.forwardRef(function NavLink(
  { to, end, className, style, children, ...rest },
  ref,
) {
  const { pathname } = useLocation();
  const base = useRouteBase();
  const target = resolveTo(to, base).split(/[?#]/)[0].replace(/\/$/, "") || "/";
  const cur = pathname.replace(/\/$/, "") || "/";
  const isActive = end ? cur === target : cur === target || cur.startsWith(target === "/" ? "/" : `${target}/`) && (target !== "/" || cur === "/");
  const args = { isActive, isPending: false, isTransitioning: false };
  return (
    <Link
      ref={ref}
      to={to}
      aria-current={isActive ? "page" : undefined}
      className={typeof className === "function" ? className(args) : [className, isActive ? "active" : ""].filter(Boolean).join(" ")}
      style={typeof style === "function" ? style(args) : style}
      {...rest}
    >
      {typeof children === "function" ? children(args) : children}
    </Link>
  );
});

export function Navigate({ to, replace, state }) {
  const navigate = useNavigate();
  const href = resolveTo(to, useRouteBase());
  useEffect(() => {
    navigate(href, { replace, state });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href]);
  return null;
}

/* ------------------------------------------------------------------ */
/* Routes / Route / Outlet                                              */
/* ------------------------------------------------------------------ */

const RouteContext = createContext(null);

export function BrowserRouter({ children }) {
  return <>{children}</>;
}
export const HashRouter = BrowserRouter;
export const MemoryRouter = BrowserRouter;

export function Route() {
  return null; // wird ausschließlich von <Routes> ausgewertet
}

function createRoutesFromChildren(children) {
  const routes = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === React.Fragment) {
      routes.push(...createRoutesFromChildren(child.props.children));
      return;
    }
    const { path, index, element, children: sub } = child.props;
    routes.push({ path, index: !!index, element, children: createRoutesFromChildren(sub) });
  });
  return routes;
}

function joinPaths(a, b) {
  return `${a}/${b}`.replace(/\/+/g, "/");
}

function flatten(routes, parentPath = "", parents = [], out = []) {
  routes.forEach((route) => {
    const full = route.path != null
      ? route.path.startsWith("/") ? route.path : joinPaths(parentPath, route.path)
      : parentPath;
    const chain = [...parents, { ...route, fullPath: full }];
    if (route.children.length) flatten(route.children, full, chain, out);
    if (route.path != null || route.index) out.push({ path: full || "/", chain });
  });
  return out;
}

function scorePath(path, isIndex) {
  const segs = path.split("/").filter(Boolean);
  let score = segs.length;
  for (const s of segs) {
    if (s === "*") score -= 2;
    else if (s.startsWith(":")) score += 3;
    else score += 10;
  }
  return score + (isIndex ? 2 : 0);
}

export function matchPath(pattern, pathname) {
  const pat = typeof pattern === "string" ? pattern : pattern.path;
  const end = typeof pattern === "string" ? true : pattern.end !== false;
  const pSegs = pat.split("/").filter(Boolean);
  const uSegs = pathname.split("/").filter(Boolean);
  const params = {};
  for (let i = 0; i < pSegs.length; i++) {
    const p = pSegs[i];
    if (p === "*") {
      params["*"] = uSegs.slice(i).map(decodeURIComponent).join("/");
      return { params, pathname, pathnameBase: "/" + uSegs.slice(0, i).join("/"), pattern: pat };
    }
    const u = uSegs[i];
    if (u === undefined) {
      if (p.endsWith("?")) continue;
      return null;
    }
    if (p.startsWith(":")) params[p.slice(1).replace(/\?$/, "")] = decodeURIComponent(u);
    else if (p.toLowerCase() !== u.toLowerCase()) return null;
  }
  if (end && uSegs.length > pSegs.length) return null;
  return { params, pathname, pathnameBase: "/" + uSegs.slice(0, pSegs.length).join("/"), pattern: pat };
}

export function useMatch(pattern) {
  const { pathname } = useLocation();
  return useMemo(() => matchPath(pattern, pathname), [pattern, pathname]);
}

export function Routes({ children }) {
  const { pathname } = useLocation();
  const parent = useContext(RouteContext);
  const branches = useMemo(() => {
    const prefix = parent?.pathnameBase && parent.pathnameBase !== "/" ? parent.pathnameBase : "";
    return flatten(createRoutesFromChildren(children), prefix).map((b, i) => ({
      ...b,
      order: i,
      score: scorePath(b.path, b.chain[b.chain.length - 1].index),
    }));
  }, [children, parent?.pathnameBase]);

  const match = useMemo(() => {
    let best = null;
    for (const b of branches) {
      const m = matchPath(b.path, pathname);
      if (!m) continue;
      if (!best || b.score > best.b.score) best = { b, m };
    }
    return best;
  }, [branches, pathname]);

  if (!match) return null;
  const { b, m } = match;
  const params = { ...(parent?.params || {}), ...m.params };
  let outlet = null;
  for (let i = b.chain.length - 1; i >= 0; i--) {
    const r = b.chain[i];
    const el = r.element === undefined ? <Outlet /> : r.element;
    outlet = (
      <RouteContext.Provider
        value={{ params, outlet, pathnameBase: m.pathnameBase, outletContext: undefined }}
      >
        {el}
      </RouteContext.Provider>
    );
  }
  return outlet;
}

const OutletCtx = createContext(undefined);

export function Outlet({ context }) {
  const ctx = useContext(RouteContext);
  if (!ctx?.outlet) return null;
  return <OutletCtx.Provider value={context}>{ctx.outlet}</OutletCtx.Provider>;
}

export function useOutletContext() {
  return useContext(OutletCtx);
}

export function useOutlet() {
  return useContext(RouteContext)?.outlet ?? null;
}

export function useParams() {
  return useContext(RouteContext)?.params ?? {};
}

export function generatePath(path, params = {}) {
  return path.replace(/:(\w+)\??/g, (_, k) => encodeURIComponent(params[k] ?? "")).replace(/\*$/, params["*"] ?? "");
}

export function useBlocker() {
  return { state: "unblocked", proceed() {}, reset() {} };
}

export function ScrollRestoration() {
  return null;
}

export default {
  BrowserRouter, Routes, Route, Link, NavLink, Navigate, Outlet,
  useLocation, useNavigate, useParams, useSearchParams, matchPath, useMatch,
};
