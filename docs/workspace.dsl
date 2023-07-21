workspace {
    !docs workspace-docs

    model {
        user = person "User"
        softwareSystem = softwareSystem "Fossil" {
            writer = container "Writer" {
                user -> this "Uses"

                httpHandler = component "HttpHandler" "Handles incoming HTTP requests"
                requestRouter = component "RequestRouter" "Routes incoming requests to the writer that holds the stream."
                httpHandler -> requestRouter "delegates"
                streamOwnershipRing = component "StreamOwnershipRing" "Defines which writer owns which stream"
                requestRouter -> streamOwnershipRing "identifies ownership"
                writerMembershipList = component "WriterMembershipList" "Knows about which writer exists in the cluster."
                streamOwnershipRing -> writerMembershipList "identifies ownership"

                requestHandler = component "EventWriter" "Actually writes events"
                requestRouter -> requestHandler "executes"
                streamLocker = component "StreamLocker" "Distributed lock, per-stream."
                requestHandler -> streamLocker "uses"
            }

            consul = container "Consul" {
                writer -> this "Reads & write configuration"
            }

            writerMembershipList -> consul
            streamLocker -> consul

            pulsar = container "Pulsar" {
                writer -> this "Writes events in order"
            }

            requestHandler -> pulsar
        }
    }

    views {
        systemlandscape "SystemLandscape" {
            include *
            autoLayout
        }

        systemContext softwareSystem {
            include *
            autolayout lr
        }

        container softwareSystem {
            include *
            autolayout lr
        }

        component writer "Writer" {
            include *
            autoLayout
            description "The component diagram."
        }

        theme default
    }

}