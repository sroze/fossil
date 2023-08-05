workspace {
    !docs workspace-docs

    // TODO: split 'segment topology & segment manager' AND 'node presence' & 'router'
    //    -> reason: `router` & `node presence` are just an optimisation.
    // TODO: extract `streamstore` as its own system.
    model {
        user = person "User"
        softwareSystem = softwareSystem "Fossil" {
            store = container "Fossil Store" {
                user -> this "Uses"

                grpcHandler = component "GrpcHandler" "Handles incoming gRPC requests"

                writeRequestRouter = component "WriteRequestRouter" "Routes incoming write requests to the writer that holds the stream."
                grpcHandler -> writeRequestRouter

                reader = component "Reader" "Handle stream reads"
                grpcHandler -> reader

                presence = component "Node Presence" "Keeps track of the node in the cluster"

                segmentsTopology = component "Segments Topology" "Keeps track of segments and their location in the system"
                writeRequestRouter -> segmentsTopology
                reader -> segmentsTopology

                allocator = component "Segment Allocator" "Allocates segments to nodes"
                allocator -> presence
                allocator -> segmentsTopology

                writer = component "Writer" "Is single-reader for specific segments and write for them."
                writeRequestRouter -> writer
                writer -> segmentsTopology

                streamStore = component "Stream Store" "Read and writes events within a specific stream" {
                    writer -> this
                    reader -> this
                }
            }


            kv = container "KV store" {
                streamStore -> this "Reads & write"
            }
        }
    }

    views {
        systemContext softwareSystem {
            include *
            autolayout lr
        }

        container softwareSystem {
            include *
            autolayout lr
        }

        component store "FossilStore" {
            include *
            autoLayout
            description "The component diagram."
        }

        theme default
    }

}