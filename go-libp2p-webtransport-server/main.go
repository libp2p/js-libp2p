package main

import (
	"fmt"
	"time"

	"github.com/libp2p/go-libp2p"
	webtransport "github.com/libp2p/go-libp2p/p2p/transport/webtransport"
	"github.com/multiformats/go-multiaddr"
)

func main() {
	h, err := libp2p.New(libp2p.Transport(webtransport.New))
	if err != nil {
		panic(err)
	}

	err = h.Network().Listen(multiaddr.StringCast("/ip4/127.0.0.1/udp/9195/quic/webtransport"))
	if err != nil {
		panic(err)
	}

	for _, a := range h.Addrs() {
		withP2p := a.Encapsulate(multiaddr.StringCast("/p2p/" + h.ID().String()))
		fmt.Println("Listening on\n", withP2p)
	}

	time.Sleep(time.Hour * 24)
}
