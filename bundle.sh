mkdir -p .bundle/
cd .bundle
cp -a ../controllers/ controllers
cp -a ../definitions/ definitions
cp -a ../schemas/ schemas
cp -a ../public/ public
cp -a ../resources/ resources
cp -a ../views/ views

tpm create wiki.package
cp wiki.package ../wiki.bundle

cd ..
rm -rf .bundle
echo "DONE"