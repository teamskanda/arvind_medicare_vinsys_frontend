import type { NextConfig } from "next";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,

  /**
   * Serve the widget loader from this origin.
   *
   * The install snippet a customer pastes points at `{widget base}/w/{id}.js`,
   * so they see one hostname for both the script and the iframe. The script
   * itself is generated per chatbot by the backend (helpers/widget.py), and
   * this rewrite is what puts it on the same host in development and in any
   * deployment where Next sits in front of the API. Behind a CDN or load
   * balancer, route `/w/*` to the backend there instead and this rewrite
   * never fires.
   */
  async rewrites() {
    return [{ source: "/w/:path*", destination: `${API_URL}/w/:path*` }];
  },

  async headers() {
    return [
      {
        /**
         * The dashboard and marketing pages. `X-Frame-Options: DENY` stops
         * our own authenticated UI being framed, which is what prevents
         * clickjacking of the customer's account.
         *
         * The negative lookahead excludes `/embed/*`, which exists precisely
         * to be framed — see the next entry.
         */
        source: "/((?!embed).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        /**
         * The public chatbot. This page must be embeddable on any customer's
         * website, so framing is allowed — `X-Frame-Options` is deliberately
         * absent here, and `frame-ancestors *` states the same thing in CSP
         * terms for browsers that prefer it.
         *
         * Known limitation, stated plainly: this permits *any* site to frame
         * a published chatbot. Narrowing it to the customer's own
         * `allowed_domains` needs a per-request lookup of the chatbot before
         * the response headers are written, which the App Router cannot do
         * from a page. The backend's allowed-domain check on the chat
         * endpoint is the control that is actually in force today; see
         * `check_embedding_origin` in backend/helpers/deployment.py, which
         * is explicit about being a supplementary signal rather than
         * authentication. Browser-enforced `frame-ancestors` per chatbot is
         * a Phase 4 item.
         */
        source: "/embed/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // These URLs are one per customer chatbot and must not be indexed.
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
