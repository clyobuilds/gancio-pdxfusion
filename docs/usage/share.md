# Share

We don't care about making hits so we export events in many ways: via RSS feeds, via global or individual ics, allowing you to embed list of events or single event [via iframe or webcomponent](./embed) on other websites, via [ActivityPub](./federation), [microdata](https://developer.mozilla.org/en-US/docs/Web/HTML/Microdata) and [microformat](https://developer.mozilla.org/en-US/docs/Web/HTML/microformats#h-event).  
Unlike [GAFAM](https://en.wikipedia.org/wiki/Big_Tech) that does everything to keep users and data about them, we believe that information, like people, must be free.
People can stay updated without necessarily going through the site because we don't need your attention or to sell you anything.

On each node, next to the “Add event” button, there is a “Share” button that allows you to easily access these features.

## Feed RSS
To follow updates from a computer or smartphone without the need to periodically open this site you can use RSS feeds.

With RSS feeds you use a special app to receive updates from sites that interest you. It's a good way to follow many sites quickly, without the need to create an account or other complications.

- If you have Android, we recommend Flym or Feeder
- For iPhone / iPad you can use Feed4U
- For desktop / laptop we recommend Feedbro, to be installed on Firefox or Chrome .


Gancio expose the following feeds:

- The main feed is displayed on the homepage (note that if you selected a `Collection` in home, that collection is exposed) [example](https://demo.gancio.org/feed/rss)
- Each place has its own feed. [example](https://demo.gancio.org/feed/rss/place/3949)
- Each tag has its own feed. [example](https://demo.gancio.org/feed/rss/tag/scacchi)
- Each collection has its own feed. [example](https://demo.gancio.org/feed/rss/collection/friends)


Technically, pages that display feeds also inform visitors (and client) of this by displaying this information in special tags in the HTML header:

```html
<link rel="alternate" type="application/rss+xml" title="Gancio Demo" href="https://demo.gancio.org/feed/rss">
```


Furthermore, by requesting certain pages with a specific `Content-Type` (`application/rss+xml`), you will be redirected directly to the feed.


## Feed ICS
Computers and smartphones are commonly equipped with a calendar app capable of importing a remote calendar.

Gancio also exports its events in this format, either individually or grouped together as explained above for RSS feeds.

You can add a single event to remind yourself (there is a special “Add to calendar” button), but you can also include the entire calendar in your favorite client (e.g., Thunderbird).



## Embedd
You can embed a list of filtered events or a specific event card in your webpage using a classic old-school `iframe` or a shiny new webcomponent.
Detailed information about this into the [specific page](./embed)