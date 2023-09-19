workspace {
    !docs workspace-docs

    model {
        user = person "User"
        softwareSystem = softwareSystem "Fossil" {
            store = container "Fossil Store API" {
                user -> this "Uses"

                grpcServer = component "GrpcServer" "Handles incoming gRPC requests"

                writeRequestRouter = component "WriteRequestRouter" "Routes incoming write requests to preferred writers for performance reasons."
                grpcServer -> writeRequestRouter

                presence = component "Node Presence" "Keeps track of the node in the cluster"
                writeRequestRouter -> presence

                segmentsTopology = component "Segments Topology" "Keeps track of segments and their location in the system"

                allocator = component "Segment Manager" "Opens and close segments based on needs"
                allocator -> segmentsTopology


                segmentsStore = component "Segments Store" "Event store, read/write and query-ing across streams." {
                    writeRequestRouter -> this

                    this -> segmentsTopology
                }

                streamStore = component "Stream Store" "Read and writes events within a specific stream" {
                    segmentsStore -> this
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