# Code

This section is to support people who want to contribute to the source code.

Building software means taking a stand, making decisions, choices: you can read our choices on [the homepage](https://gancio.org).

To help with issues you can check for [Contibution welcome](https://framagit.org/les/gancio/-/issues/?sort=updated_desc&state=opened&label_name%5B%5D=Contribution%20welcome&first_page_size=100), [good first issue](https://framagit.org/les/gancio/-/issues/?sort=updated_desc&state=opened&label_name%5B%5D=good%20first%20issue&first_page_size=100) or [help needed](https://framagit.org/les/gancio/-/issues/?sort=updated_desc&state=opened&label_name%5B%5D=good%20first%20issue&first_page_size=100) tags.

**Please use clean, concise titles for your merge requests.** Unless the merge request is about refactoring code or other internal tasks, assume that the person reading the merge request title is not a programmer but an user and **try to describe your change or fix from their perspective**. We use commit squashing, so the final commit in the main branch will carry the title of the merge request, and commits from the main branch are fed into the changelog.
Please use [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) in your commit messages.
Please make forks you want to merge upstream public and possibly [allow commits](https://docs.gitlab.com/user/project/merge_requests/allow_collaboration/#allow-commits-from-upstream-members) from upstream members when requesting a merge request.


<!--
TODO
#### Nuxt3 / Gancio lifecycle:
- nuxt.config.ts:
  load the `runtimeConfig` from environment: `base_url`, db parameters and gancio `version` from package.json)
  - fallback from legacy config.json?

- loading nitro plugins in server/plugins:
  - connect to the database
  - load settings (populate publicSettings /secretSettings utility)

- nuxt server plugins in server (middleware, api, routes)

- runtime plugins in plugins (.client.ts / .server.ts)

- composable for reusable vue logic (auth)
- plugins for global initialization or inject functionality (provide luxon, provide notify)
- utilities helper function without state -->

## API / Backend

In Nuxt3, API endpoints and server routes are defined inside the `/server` directory. For more details, see the [Nuxt Server Directory documentation](https://nuxt.com/docs/guide/directory-structure/server).
Nuxt3 uses [Nitro](https://nitro.unjs.io/) as the server engine, which automatically scans the `/server` directory for API and route files.
Server code runs only on the backend and can securely access environment variables, the database and other server-side resources.

There are two main ways to create backend logic:

- **API Routes:**
  Place files inside `/server/api/`. Each file (e.g. [server/api/utils/ping.ts](https://framagit.org/les/gancio/-/tree/main/server/api/utils/ping.ts) automatically becomes an endpoint (`/api/utils/ping`).
  The filename and extension determine the HTTP method (`.get.ts`, `.post.ts`, etc.).

- **Custom Server Routes:**
  For more advanced routing, place files in `/server/routes/`. The filename and folder structure map directly to the route path. You can use any HTTP method and have full control over the request/response.

Used HTTP library is [h3](https://v1.h3.dev/).

### Access query parameters

You can use `event.context.params?.query` or `getQuery(event)`.

### Access route api params

You can use `event.context.params?.name` or `getRouterParam(event, 'name')` or `const { name } = getRouterParams(event)`.

### Access Request Headers

You can use `getHeaders(event)` to get an array with all request headers or `getHeaders(event, name)` to get a request header by name.

### Access body

This is needed when using `POST` or `PUT` HTTP method to get sent data: `readBody(event)`

### Set header

To set a header, you can use `setHeader(event, name, value)`, for instance:

```ts
setHeader(event, 'Content-Type', 'application/json')
```

<!-- - Middleware and plugins can be added in `/server/middleware/` and `/server/plugins/` for logic like authentication, logging, or database connections. -->

### Access global settings

You can use the `publicSettings` or `secretSettings` server utilities. They are defined at `server/services/settings.ts`. Import them using:

```ts
import { publicSettings, secretSettings } from '~~/server/services/settings
```

### Return errors

To throw an error from an endpoint you should use `createError`. For instance:

```ts
throw createError({ status: 404, message: 'Not found' })
```

See [Manage errors](#manage-errors) for more details.

### Getting random values

To get a random value you can use `crypto.randomUUID()`. See [randomUUID documentation](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID).

### Logs

To record user's activiy you should use logging using `useLogger('name')` and `log`. For instance:

```ts
const log = useLogger('events')
log.info('Event has been updated')
```

There are four log levesls

* `log.info`: useful information about application activity.
* `log.warning`: information to be aware of.
* `log.error`: fatal error, application did not end susccesfully.
* `log.debug`: useful information for developers, sysadmins...

### Send a raw file

To serve a raw file we have the helper function `serveFile`. For instance:

```ts
return serveFile(event, filePath)
```

See the event card fallback image as an example: [`server/routes/fallbackimage.png.ts`](https://framagit.org/les/gancio/-/blob/main/server/routes/fallbackimage.png.ts).

## Authentication

There are some utilities to manage authentication and authorization in the server.

```ts
import { requireAdmin, requireUser, requireRole, isRole } from '~~/server/lib/auth'
import { getUser } from '~~/server/lib/getUser'
```

::: tip
`getUser` is in a different file because it is easier to mock it in tests
:::

### Get current logged user

We can get the current user using `getUser`:

```ts
const user = await getUser(event)
```

 If no user is logged, we will get a warning and `user` will be undefined.

### Require a logged user

The same as `getUser` but if there is no user logged in, a 401 error (Unauthorized) will be thrown.

```ts
const user = await requireUser(event)
```

### Require a specific role

To require a role, you can add the follwing line. If current user is not the passed role, a 401 error (Unauthorized) will be thrown.

```ts
const user = await requireRole(event, 'editor')
```

### Require an admin user

To require `admin` role, you can add the follwing line. If current user is no admin, a 401 error (Unauthorized) will be thrown.

```ts
await requireAdmin(event)
```

### Check if user has a specific role

To check if a user has a certain role you can use `hasRole`. For instance:

```ts
const hasRole = await isRole(event, 'editor')
```

## Documenting API

As you can see in the [API](/dev/api) section, there are some documented API endpoints. We use [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc) and
[vitepress-openapi](https://vitepress-openapi.vercel.app/) to get these endpoints automatically documented.

To get this automated documentation ready to use, you should add the proper docstring using [OpenAPI specification](https://spec.openapis.org/oas/).

For instance:
* See docstring for [/api/login/token (POST)](https://framagit.org/les/gancio/-/blob/main/server/api/login/token.post.ts) to get an authentication token.
* See docstring for [/api/user (GET)](https://framagit.org/les/gancio/-/blob/main/server/api/user/index.get.ts?ref_type=heads) to get current user.

You have more examples at `server/api` folder.

You can check your API endpoint is right documented running:

````sh
pnpm run docs:dev
````

Your endpoint documentation should be shown in sidebar menu, at API section.

## Task Manager / Queue scheduling

The **[Task Manager](https://framagit.org/les/gancio/-/blob/main/server/services/taskManager.ts)** is an utility for scheduling and running background tasks. It is used to automate recurring maintenance and notification jobs without blocking the main application flow.
We initially evaluated several existing solutions, including Redis-based queue managers like [Bull](https://github.com/OptimalBits/bull) and job schedulers like [Croner](https://github.com/hexagon/croner), however, Redis’ licensing model at the time was incompatible and we want to avoid adding another dependency.

We also reviewed [nightcoral](https://code.lag.net/robey/nightcoral), a lightweight and well-designed task queue but while the codebase was impressive we realized we could achieve similar functionalities by extending our existing TaskManager implementation adding exception management and customizable retries on failure.

**What it's used for:**

- Cleaning up unused / orphan resources (tags, places, AP actors - running once a day)
- Creating new instances of recurring events (running each half an hour)
- Removing past federated events and related resources (twice a day)
- [Sending ActivityPub notifications](https://framagit.org/les/gancio/-/blob/main/server/federation/helpers.ts#L78)
- Sending e-mails

**What we will use it for:**

- Sending daily or periodic notifications
- Synchronizing federated profiles

**How it works:**

- Tasks are defined as instances of the `Task` class, specifying a name, method to execute, repeat interval, and other options.
- The `TaskManager` manages a queue of these tasks, running them at the specified intervals.
- Tasks can be set to repeat, run once, retry on failure.

### **Example: Adding a new task**

First of all you'll need the utils `useTaskManager`: this will expose you the singleton instance of the TaskManager.
To add a new task, you can use the `add` method of the `TaskManager`. For example, [the code](https://framagit.org/les/gancio/-/blob/main/server/services/sendMail.ts) that enqueue an email is:

```ts
useTaskManager().add({
  name: "MAIL",
  method: sendMail,
  args: [addresses, template, locals, locale, bcc]
})
```

**Task options:**

- `name`: String, name of the task (used in logs).
- `method`: Function to execute.
- `args`: Array, arguments to pass to the method (optional).
- `repeat`: Boolean, whether the task should repeat (default: false).
- `repeatDelay`: Number, interval in seconds between executions (default: 1).
- `callAtStart`: Boolean, whether to run the task immediately when added (default: false).
- `retries`: Array, delays in seconds for retrying failed tasks (default: [10, 30]).

### Sending E-mail

To send emails in the background, use the `enqueueMail` utility. This schedules the email to be sent as a task, ensuring that email delivery does not block the main application flow and retrying in case of failure. For example:

```ts
enqueueMail(
  "user@example.com", // recipient addresses (string or array)
  "register", // template name (template files are in `/server/emails`)
  { username: "Alice" }, // template variables (optional)
  "en", // locale (optional)
  false, // use BCC for recipient (optional)
);
```

This will add a mail-sending task to the `TaskManager` queue. The actual sending is handled asynchronously, and you can customize the template and variables as needed.
Email templates are located in the `/server/static/emails/` directory. The content of these emails is localized, with translations and language-specific strings stored in `i18n/locales/email`.


## Plugin controller

The plugin controller is responsible for managing and loading plugins. It holds a list of loaded plugins and provides methods for interacting with them.
Plugins are loaded from the `PLUGINS_PATH` directory and are automatically discovered and initialized by the controller.

## FrontEnd

### Settings

To get settings:

```ts
const settings = useState<Settings>("settings");
```

### Mobile first

Use `:fullscreen="$vuetify.display?.mobile"` for any `v-dialog`.

NOTE: The issue with this is that `$vuetify.display` is ready on client only so we do have hydration issues (i.e. i want the calendar to have 2 cols only not in mobile,
this could not be done in SSR, let's test with <https://masteringnuxt.com/blog/mobile-detection-with-nuxt-ssr>)

### Composable

We use
[composables](https://nuxt.com/docs/guide/directory-structure/composables) for
utilities like validators, times formatter, events management. To share state
in composable use `useState`.

### Call API

Use `useFetch` if you need SSR (i.e. loading events at home page).
Internally it calls the method only once in SSR and pass the payload to the client that has not to re-fetch the data.
`useFetch` has an internal key that uses to refresh the request.

- Do not use `useFetch` inside methods!
- Use `$fetch` for data needed in client only (i.e. a `v-combobox` with autocompletion).

### Notify user

Use:

```ts
$notify('message')
```

The message could be a translated string.

### Access / Authorization / Validate / User / Role

This is a middleware that redirect to login page when user is not logged in

```ts
definePageMeta({ middleware: ['authenticated'] })

const { loggedIn, session, user, clear, fetch } = useUserSession()
const { isAdmin } = useAuth()
```

<!-- TODO: ### Theme (system / light / dark) -->

## Manage errors

Both in client and in server you can `throw createError` using `statusCode` and `statusMessage` fields.

Let's say I'm visiting an event that does not exist:
in the page component (`app/pages/event/[slug].vue`) we will try to get the event details and throw an error if we fail:

```ts
const { data: event, refresh, error } = await useFetch<EventAPI>(`/api/event/detail/${route.params.slug}` )
if (!event.value || error.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 500,
    statusMessage: error.value?.statusMessage ?? 'Fetch Error'
  })
}
```

In back-end (`server/api/event/detail/[slug_or_id].ts`) we can use the same `createError`:

```ts
if (!event) {
  log.warn(`Event not found: ${slug_or_id}`)
  throw createError({ statusCode: 404, message: 'Event not found' })
}
```

Note that in UI errors will be rendered in a specific error page in `app/error.vue`

Check nuxt documentation for details => <https://nuxt.com/docs/4.x/getting-started/error-handling>

<!-- TODO: ## Unit testing -->
