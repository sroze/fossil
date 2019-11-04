FROM scratch
COPY fossil /
ENV USER fossil
ENTRYPOINT ["/fossil"]
CMD ["server"]
EXPOSE 80
