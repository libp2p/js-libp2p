image_name := js-libp2p-head

all: node-image.json firefox-image.json chromium-image.json webkit-image.json

node-image.json:
	cd .. && docker build -f interop/Dockerfile -t ${image_name} .
	docker image inspect ${image_name} -f "{{.Id}}" | \
		xargs -I {} echo "{\"imageID\": \"{}\"}" > $@
# Necessary because multistage builds require a docker image name rather than a digest to be used
	docker image tag $$(jq -r .imageID node-image.json) ${image_name}

chromium-image.json: node-image.json
	cd .. && docker build -f interop/BrowserDockerfile --build-arg=BASE_IMAGE=${image_name} --build-arg=BROWSER="chromium" -t chromium-${image_name} .
	docker image inspect chromium-${image_name} -f "{{.Id}}" | \
		xargs -I {} echo "{\"imageID\": \"{}\"}" > $@

firefox-image.json: node-image.json
	cd .. && docker build -f interop/BrowserDockerfile --build-arg=BASE_IMAGE=${image_name} --build-arg=BROWSER="firefox" -t firefox-${image_name} .
	docker image inspect firefox-${image_name} -f "{{.Id}}" | \
		xargs -I {} echo "{\"imageID\": \"{}\"}" > $@

webkit-image.json: node-image.json
	cd .. && docker build -f interop/BrowserDockerfile --build-arg=BASE_IMAGE=${image_name} --build-arg=BROWSER="webkit" -t webkit-${image_name} .
	docker image inspect webkit-${image_name} -f "{{.Id}}" | \
		xargs -I {} echo "{\"imageID\": \"{}\"}" > $@

.PHONY: clean

clean:
	rm *image.json
