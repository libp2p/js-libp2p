image_name := js-libp2p-head

all: image.json firefox-image.json chromium-image.json webkit-image.json

image.json:
	cd .. && docker build -f interop/Dockerfile -t ${image_name} .
	docker image inspect ${image_name} -f "{{.Id}}" | \
		xargs -I {} echo "{\"imageID\": \"{}\"}" > $@

chromium-image.json: image.json
	cd .. && docker build -f interop/BrowserDockerfile --build-arg=BASE_IMAGE=${image_name} --build-arg=BROWSER="chromium" -t chromium-${image_name} .
	docker image inspect chromium-${image_name} -f "{{.Id}}" | \
		xargs -I {} echo "{\"imageID\": \"{}\"}" > $@

firefox-image.json: image.json
	cd .. && docker build -f interop/BrowserDockerfile --build-arg=BASE_IMAGE=${image_name} --build-arg=BROWSER="firefox" -t firefox-${image_name} .
	docker image inspect firefox-${image_name} -f "{{.Id}}" | \
		xargs -I {} echo "{\"imageID\": \"{}\"}" > $@

webkit-image.json: image.json
	cd .. && docker build -f interop/BrowserDockerfile --build-arg=BASE_IMAGE=${image_name} --build-arg=BROWSER="webkit" -t webkit-${image_name} .
	docker image inspect webkit-${image_name} -f "{{.Id}}" | \
		xargs -I {} echo "{\"imageID\": \"{}\"}" > $@

.PHONY: clean

clean:
	rm *image.json
