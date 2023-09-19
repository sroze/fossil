# For some reasons, we need to apply this change to be able to fun FoundationDB on
# Mac in Docker. Note that the version is also very important, older version simply
# segfault when started in these conditions.
#
# @see https://forums.foundationdb.org/t/how-to-run-foundationdb-on-a-mac/3563/10

FROM foundationdb/foundationdb:7.1.22
RUN sed -i '$ s/$/ --knob_disable_posix_kernel_aio=1/' /var/fdb/scripts/fdb.bash

# Anyway, this does not seem to work:
# ```
# [root@d5ca3785b298 /]# fdbcli
# ERROR: Disk i/o operation failed (1510)
# ```
#
# Same on M2: https://forums.foundationdb.org/t/foundationdb-on-docker-mac-m2/3876

# Another option, using 7.1.27 (https://github.com/apple/foundationdb/releases/tag/7.1.27)
# does start the container, but quickly grows in memory and get "killed".
# ```
# [root@655a38bd2a7a /]# fdbserver
# Killed
# ```

# Next... try to run it on Mac directly 😢
