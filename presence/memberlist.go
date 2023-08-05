package presence

import (
	"fmt"
	"github.com/hashicorp/memberlist"
	"net"
)

// TODO: implementation of `Presence` with memberlist

// Define a delegate to receive events about cluster changes
type delegate struct{}

// NotifyJoin is invoked when a node is detected to have joined.
// The Node argument must not be modified.
func (d *delegate) NotifyJoin(n *memberlist.Node) {
	fmt.Printf("A new node has joined: %s\n", n.Name)
}

// NotifyLeave is invoked when a node is detected to have left.
// The Node argument must not be modified.
func (d *delegate) NotifyLeave(n *memberlist.Node) {
	fmt.Printf("A node has left: %s\n", n.Name)
}

// NotifyUpdate is invoked when a node is detected to have updated, usually involving its meta data.
// The Node argument must not be modified.
func (d *delegate) NotifyUpdate(n *memberlist.Node) {
	fmt.Printf("A node has updated: %s\n", n.Name)
}

func newMember(name string, port int) (*memberlist.Memberlist, error) {
	listConfig := memberlist.DefaultLocalConfig()
	listConfig.Name = name
	listConfig.Events = &delegate{}

	listConfig.BindPort = port
	listConfig.AdvertisePort = listConfig.BindPort

	listConfig.BindAddr = "127.0.0.1"
	listConfig.AdvertiseAddr = listConfig.BindAddr

	// Create a new member
	list, err := memberlist.Create(listConfig)
	if err != nil {
		return nil, err
	}

	// Assign a unique address to this member
	addr, err := net.ResolveTCPAddr("tcp", listConfig.BindAddr+":"+fmt.Sprint(listConfig.BindPort))
	if err != nil {
		return nil, err
	}

	listConfig.BindAddr = addr.IP.String()
	listConfig.BindPort = addr.Port

	return list, nil
}
