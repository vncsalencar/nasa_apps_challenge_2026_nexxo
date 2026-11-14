# Nexxo (nexxo.vncs.dev): health monitoring dashboard for astronauts, a hackathon project.
#
# This file is a copy of /etc/nixos/nexxo.nix on the VPS. The VPS imports it from configuration.nix.
#
# The app is a Docker Compose project in /root/apps/nexxo and listens on 127.0.0.1:8085.
# The SQLite file is in the Docker volume nexxo_nexxo-data.
#
# Redeploy, from the nexxo repository on a dev machine:
#   ./deploy/deploy.sh
{ ... }:

{
  # Proxied by Cloudflare (the *.vncs.dev wildcard), hence HTTP-01 instead of TLS-ALPN.
  #
  # The address is open, with no login. Each person who knows the address can use the simulator
  # and delete missions. If you add ANTHROPIC_API_KEY to /root/apps/nexxo/.env, put a login back
  # first (basic_auth), because a visitor can then start paid requests to a language model.
  services.caddy.extraConfig = ''

    nexxo.vncs.dev {
      tls {
        issuer acme {
          disable_tlsalpn_challenge
        }
      }

      header {
        X-Robots-Tag "noindex, nofollow"
        -Server
      }

      encode zstd gzip

      # flush_interval -1: the page keeps one Server-Sent Events connection open for live
      # updates. Caddy must send each event at once instead of buffering it.
      reverse_proxy 127.0.0.1:8085 {
        flush_interval -1
      }
    }
  '';
}
