cd medtimeline

# Hide the fhir_config.js we're using so it doesn't get synthesized into the build.
mv src/app/fhir_config.js ../fhir_config.js
touch src/app/fhir_config.js

# Build the demo into the docs folder in the root of the repository.
ng build --prod --output-path ../docs --base-href /medtimeline/ --configuration dev_mock 

# Put back the fhir_config where it belongs.
rm src/app/fhir_config.js
mv ../fhir_config.js src/app/fhir_config.js

# Make a new commit for the documentation.
cd ..
git add docs
git commit -m "Update Github Pages demo."

