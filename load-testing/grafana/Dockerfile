FROM grafana/grafana:5.4.2

USER root

RUN apt-get update && apt-get install -y procps gettext-base && rm -rf /var/lib/apt/lists/*

WORKDIR /etc/grafana

COPY datasources ./datasources
COPY dashboard/* /etc/grafana/provisioning/dashboards/

WORKDIR /app
COPY entrypoint.sh ./
RUN chmod u+x entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
