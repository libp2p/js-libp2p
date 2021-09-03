package main

// this code has been extracted from https://github.com/libp2p/go-libp2p-kbucket/blob/b90e3fed3255e131058ac337a19beb2ad85da43f/table_refresh.go#L45
// if the hash of that file changes it may need to be re-extracted

import (
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"strconv"
)

// maxCplForRefresh is the maximum cpl we support for refresh.
// This limit exists because we can only generate 'maxCplForRefresh' bit prefixes for now.
const maxCplForRefresh uint = 15

// GenRandPeerID generates a random peerID for a given Cpl
func GenRandPeerID(targetCpl uint, randPrefix uint16, localKadId []byte, keyPrefixMap []uint32) ([]byte, error) {
	if targetCpl > maxCplForRefresh {
		return nil, fmt.Errorf("cannot generate peer ID for Cpl greater than %d", maxCplForRefresh)
	}

	localPrefix := binary.BigEndian.Uint16(localKadId)

	// For host with ID `L`, an ID `K` belongs to a bucket with ID `B` ONLY IF CommonPrefixLen(L,K) is EXACTLY B.
	// Hence, to achieve a targetPrefix `T`, we must toggle the (T+1)th bit in L & then copy (T+1) bits from L
	// to our randomly generated prefix.
	toggledLocalPrefix := localPrefix ^ (uint16(0x8000) >> targetCpl)

	// Combine the toggled local prefix and the random bits at the correct offset
	// such that ONLY the first `targetCpl` bits match the local ID.
	mask := (^uint16(0)) << (16 - (targetCpl + 1))
	targetPrefix := (toggledLocalPrefix & mask) | (randPrefix & ^mask)

	// Convert to a known peer ID.
	key := keyPrefixMap[targetPrefix]

	// mh.SHA2_256, peer-id-len
	id := [34]byte{18, 32}
	binary.BigEndian.PutUint32(id[2:], key)
	return id[:], nil
}

func main() {
	jsonFile, err := os.Open("../../src/routing-table/generated-prefix-list.json")
	if err != nil {
		panic("Could not open generated prefix list")
	}

	// defer the closing of our jsonFile so that we can parse it later on
	defer jsonFile.Close()

	byteValue, err := ioutil.ReadAll(jsonFile)
	if err != nil {
		panic("Could not read generated prefix list")
	}

	var keyPrefixMap []uint32
	json.Unmarshal([]byte(byteValue), &keyPrefixMap)

	targetCpl, err := strconv.ParseUint(os.Args[1], 10, 32)
	if err != nil {
		panic("Could not parse targetCpl")
	}

	randPrefix, err := strconv.ParseUint(os.Args[2], 10, 16)
	if err != nil {
		panic("Could not parse randPrefix")
	}

	localKadId, err := base64.StdEncoding.DecodeString(os.Args[3])
	if err != nil {
		panic("Could not parse localKadId")
	}

	b, err := GenRandPeerID(uint(targetCpl), uint16(randPrefix), localKadId, keyPrefixMap)
	if err != nil {
		panic("Could not generate peerId")
	}

	fmt.Println(b)
}
