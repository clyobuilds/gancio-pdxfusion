# Settings

Gancio is a project designed to be adopted by different communities with specific use cases, which is why we tend to make features optional when we develop them.


::: tip Note
If you are searching for initial configuration (database settings, base url, http proxy, etc) take a look at [Configuration](/install/configuration).
:::

## Options

### Title
It is the name of the project/community.  
In existing nodes, it is usually linked to a word used locally or in slang relating to the action of meeting up or doing something together.  

This word will appear in a few places:

- in the header of the home page
- in the title of the RSS and ICS feeds
- in emails sent to administrators and those who are about to register
- it is the default name of the federated actor


### Description
A brief description that identifies your node, perhaps geographically or thematically?  
It will become the subtitle on the homepage and is also used in a few other places.

### Time zone
By choice, there is only one time zone per instance. You do not need to specify it for each event you enter.


### Default language
The language in which the interface is displayed is the one chosen by the visitor (the default language set in the browser), but there are some messages that we send globally (e-mails, interactions with the federation) that require a default language.

### First day of calendar week


### Allow open registration
Your node may or may not have open registration, meaning that any visitor can request a password-protected account with which they can enter events without going through a confirmation process. (default: true)

### Allow anonymous events
Enables the option to add events even for unregistered users (any visitor).
These events must be confirmed by an administrator or editor, who will receive an email notification when this kind of events are added.

### Allow recurring events
Enables the option to add recurring events.

### Show recurring events by default
When set, recurring events are displayed on the home page by default (each user can customize whether they want to see them or not using a special icon).

### Allow events without end time
Whether or not it is required to enter an end time for events

### Allow online events
Enable the option to add events that will be online (live streaming, radio shows, etc.).

### Allow event geolocation
In addition to requesting the name and address of the event location, it is possible to associate geographical coordinates and a more detailed address.

### Show download media action
Can visitors download event flyers?

### Enable moderation
Enable administrators and editors to moderate events (see the [Moderation section](./moderation) section).

### Enable report event
Any visitor can send the administrators a report of an event (see the [Report an Event](./moderation) section).

### E-mail settings
These are specific settings for setting up email sending.

## Theme

### Dark theme
Use a dark theme by default

### Hide thumbs
Do not show thumbnails on event cards

### Hide calendar
Does not display the calendar on the home page

### Logo
A logo that represent your node

### Fallback Image
This image is used as a fallback in the thumbnails of event cards that do not have an image/flyer.

### Header Image
The header image at the homepage

### Colors
You can change the theme colors in this section.


### Footer Links
In the footer bar, you can add links as you wish (e.g., to external sites or internal pages).


### Custom Javascript Code
You can integrate some javascript code that will be loaded for everyone.
Take a look at the [custom js](./custom_js) section.

### Custom CSS Style
You can customize some stylesheet too, read some example at the [custom css](./custom_css) section.
