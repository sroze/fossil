FROM scratch
COPY fossil /
ENV USER fossil
ENTRYPOINT ["/fossil"]
EXPOSE 80
