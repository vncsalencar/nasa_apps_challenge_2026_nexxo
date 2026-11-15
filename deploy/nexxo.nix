# Nexxo (nexxo.vncs.dev): a CO2 exposure panel for astronauts, a hackathon project.
#
# This file is a copy of /etc/nixos/nexxo.nix on the VPS. The VPS imports it from configuration.nix.
#
# The app is a Docker Compose project in /root/apps/nexxo and listens on 127.0.0.1:8085.
# The app keeps its state in memory and has no database.
#
# Redeploy, from the nexxo repository on a dev machine:
#   ./deploy/deploy.sh
{ ... }:

{
  # Proxied by Cloudflare (the *.vncs.dev wildcard), hence HTTP-01 instead of TLS-ALPN.
  #
  # The address is open, with no login. Each person who knows the address can open /simulator
  # and change what all dashboards show. The app holds no secret and no personal data.
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
