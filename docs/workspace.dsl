workspace {
    !docs workspace-docs

    model {
        user = person "User"
        softwareSystem = softwareSystem "Fossil" {
            store = container "Fossil Store" {
                user -> this "Uses"

                grpcHandler = component "GrpcHandler" "Handles incoming gRPC requests"

                writeRequestRouter = component "WriteRequestRouter" "Routes incoming write requests to preferred writers for performance reasons."
                grpcHandler -> writeRequestRouter

                reader = component "Reader" "Handle reads across streams"
                grpcHandler -> reader

                presence = component "Node Presence" "Keeps track of the node in the cluster"
                writeRequestRouter -> presence

                segmentsTopology = component "Segments Topology" "Keeps track of segments and their location in the system"
                reader -> segmentsTopology

                allocator = component "Segment Manager" "Opens and close segments based on needs"
                allocator -> segmentsTopology

                writer = component "Writer" "Writes events in segments & streams."
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