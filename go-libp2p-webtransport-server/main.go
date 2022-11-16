package main

import (
	"fmt"
	"io"
	"os"
	"os/signal"
	"time"

	"github.com/libp2p/go-libp2p"
	"github.com/libp2p/go-libp2p/core/network"
	webtransport "github.com/libp2p/go-libp2p/p2p/transport/webtransport"
	"github.com/multiformats/go-multiaddr"
)

func main() {
	h, err := libp2p.New(libp2p.Transport(webtransport.New))
	if err != nil {
		panic(err)
	}

	err = h.Network().Listen(multiaddr.StringCast("/ip4/127.0.0.1/udp/0/quic/webtransport"))
	if err != nil {
		panic(err)
	}

	h.SetStreamHandler("echo", func(s network.Stream) {
		io.Copy(s, s)
		s.Close()
	})

	for _, a := range h.Addrs() {
		withP2p := a.Encapsulate(multiaddr.StringCast("/p2p/" + h.ID().String()))
		fmt.Printf("addr=%s\n", withP2p.String())
	}

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	select {
	case <-c:
	case <-time.After(time.Minute):
	}
}
