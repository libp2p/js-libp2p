image_name := js-libp2p-head
TEST_SOURCES := $(wildcard test/*.ts)

# all: webkit-image.json firefox-image.json chromium-image.json node-image.json
all: node-image.json

node-image.json: Dockerfile $(TEST_SOURCES) package.json .aegir.js
	cd .. && docker build -f interop/Dockerfile -t node-${image_name} . 
	docker image inspect node-${image_name} -f "{{.Id}}" | \
		xargs -I {} echo "{\"imageID\": \"{}\"}" > $@

chromium-image.json: node-image.json BrowserDockerfile $(TEST_SOURCES) package.json .aegir.js
	cd .. && docker build -f interop/BrowserDockerfile --build-arg=BROWSER=chromium -t chromium-${image_name} .
	docker image inspect chromium-${image_name} -f "{{.Id}}" | \
		xargs -I {} echo "{\"imageID\": \"{}\"}" > $@

firefox-image.json: node-image.json BrowserDockerfile $(TEST_SOURCES) package.json .aegir.js
	cd .. && docker build -f interop/BrowserDockerfile --build-arg=BROWSER=firefox -t firefox-${image_name} .
	docker image inspect firefox-${image_name} -f "{{.Id}}" | \
		xargs -I {} echo "{\"imageID\": \"{}\"}" > $@

webkit-image.json: node-image.json BrowserDockerfile $(TEST_SOURCES) package.json .aegir.js
	cd .. && docker build -f interop/BrowserDockerfile --build-arg=BROWSER=webkit -t webkit-${image_name} .
	docker image inspect webkit-${image_name} -f "{{.Id}}" | \
		xargs -I {} echo "{\"imageID\": \"{}\"}" > $@

.PHONY: clean

clean:
	rm *image.json
