<!-- # Package and distribute a Nuxt4 app

When you build a Nuxt4 app you'll end up with a `.output` directory that contains the production-ready build of your app.
If you want to distribute your app, you can simply copy the `.output` directory to a server.
The difference with nuxt2 is that the build contains all the needed dependencies (inside `./server/node_modules`) so it does not need to install as a separate step after the package is installed.


## Goals
- [x] package could be installed via `npm install`


### Resources

- [x] migrations (needed by CLI, in dev and at startup), solved with  runtimeResolve('./migrations')
- [x] email templates (same as before ./server/static/emails)
- [x] rss.pug (same as before ./server/static/rss.pug)
- [x] opensearch.xml (same as before ./server/static/opensearch.xml)
- [x] mail i18n locales (hack with a symlink in ./server/static/emails/i18n so sendMail can use runtimeResolve, ./release.sh copies ./server/static with -L)
- [x] i18n locales
- [x] default logo / favicon / header / fallback image
- [ ] robot.txt ?
- [ ] plugins

### NPM Package
Packaging a Nuxt4 app as an npm package is not straightforward:
in gancio v1 with nuxt2 we ship the frontend "build" but the server needs to install dependencies by itself.

With nuxt4 this is not possible anymore because nitro supports different package versions using symlinks.
I first thought that the issue was related to `pnpm` symlinks the world but it turned out to be a nitro issue.

The reason why we want to avoid symlinks is that `npm pack` is not ok with them.

So for now let's go with manually flattening the dependencies with `rsync -aL .output/ .publish/` (this will copy the dependencies to the `.publish` directory without symlinks) making `npm pack` happy.

In the long run, we should remove different versions of dependencies (in general we should reduce the number of dependencies)


### The CLI issue
Having to run node server/index.mjs to start the server is not ideal, this especially because with nuxt4 you cannot decide anymore the port to listen to using. -->


