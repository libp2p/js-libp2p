image_name := js-v0.46

# TODO Enable webkit once https://github.com/libp2p/js-libp2p/pull/1627 is in
all: node-image.json chromium-image.json firefox-image.json update-lock-file

# Necessary because multistage builds require a docker image name rather than a digest to be used
load-image-json: node-image.json
	docker image tag $$(jq -r .imageID node-image.json) ${image_name}

chromium-image.json: load-image-json BrowserDockerfile
	docker build -f BrowserDockerfile --build-arg=BASE_IMAGE=${image_name} --build-arg=BROWSER=chromium -t chromium-${image_name} .
	docker image inspect chromium-${image_name} -f "{{.Id}}" | \
		xargs -I {} echo "{\"imageID\": \"{}\"}" > $@

firefox-image.json: load-image-json BrowserDockerfile
	docker build -f BrowserDockerfile --build-arg=BASE_IMAGE=${image_name} --build-arg=BROWSER=firefox -t firefox-${image_name} .
	docker image inspect firefox-${image_name} -f "{{.Id}}" | \
		xargs -I {} echo "{\"imageID\": \"{}\"}" > $@

# We update the lock file here so that we make sure we are always using the correct lock file.
# If this changes, CI will fail since there are unstaged changes.
update-lock-file: node-image.json
	CONTAINER_ID=$$(docker create $$(jq -r .imageID node-image.json)); \
	docker cp $$CONTAINER_ID:/app/package-lock.json ./package-lock.json; \
	docker rm $$CONTAINER_ID

image.json:
	docker build -t ${image_name} -f ./Dockerfile .
	docker image inspect ${image_name} -f "{{.Id}}" | \
		xargs -I {} echo "{\"imageID\": \"{}\"}" > $@

clean:
	rm -rf *-image.json

.PHONY: all clean browser-images load-image-json
