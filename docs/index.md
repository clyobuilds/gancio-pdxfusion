---
layout: home
hero:
  name: Gancio
  text: A shared agenda for local communities
  actions:
    - theme: brand
      text: Demo
      link: https://demo.gancio.org
    - theme: alt
      text: Install
      link: ./install/
    - theme: alt
      text: Usage
      link: ./usage/
---

<script setup>
  import { version, date } from '../package.json'
</script>


<div style='display: flex; gap: 1rem; flex-wrap: wrap;'>
  <v-card style='flex: 1; min-width: 300px;' title='Latest stable 1.28.2' subtitle='Stable and production ready' href='/v1/install' target='_blank' />
  <v-card style='flex: 1; min-width: 300px;' :title='`Beta release ${version}`' :subtitle='date' href='/changelog' />
</div>

::: warning :warning: Warning
This is the documentation for the alpha release of Gancio 2.0, if you are looking for the old documentation, please refer to [v1 documentation](https://gancio.org/v1).  
Please use this v2 release for new instances <u>**but do not upgrade existing ones yet**</u>.
:::


Our effort in this project is not to build an alternative that mimics mainstream solutions, we respond to different needs.
The assumption here is that technology is neither good nor bad, nor is it neutral. It does not depend (only) on how it is used.

Building software means taking a stand, making decisions, choices. These choices start from a precise look at reality, from specific needs and ends implementing specific features, choose default values, simplify some flow and patterns while making difficult others.

## **Small is better**
The use case we have in mind is that of small nodes tied either to a specific territory or at the limit a small thematic community. This choice is not very fashionable: for a long time in IT one of the priority values is scalability, this is because you are forced to imagine platforms that are suitable for hosting millions of people, millions of customers.
Structuring a project in this way simply means creating a lot of power and centralizing it in a specific place.
Long story short, even if fb/insta/tiktok was in our hands it wouldn't work, it's not only the wrong owner, it's just the tool that wasn't designed with decent values.
When we started developing gancio, we were asked for a national platform, we preferred to imagine small nodes for local communities.

## **Focus on content**
All people looking at the home page see the same events, there are no personal timelines. This is not an ego-friendly platform.
Nowhere on gancio appears the identity of who published the event, not even under a nickname, not even to administrators.
The reason for this is not only to avoid gamification but also to consider the use case we're all going into of states increasingly intolerant of displays of dissent.
That's also the reason why adding events by anonymous people is a feature enabled by default.


## **Fuck walled garden**
We don’t care about making hits so we export events in many ways: via RSS feeds, via global or individual ics, allowing you to embed list of events or single event [via iframe or webcomponent](./usage/embed.md) on other websites, via [ActivityPub](./dev/federation.md), [microdata](https://developer.mozilla.org/en-US/docs/Web/HTML/Microdata) and [microformat](https://developer.mozilla.org/en-US/docs/Web/HTML/microformats#h-event).
Unlike [GAFAM](https://en.wikipedia.org/wiki/Big_Tech) that does everything to keep users and data about them, we believe that information, like people, must be free.
People can stay updated without necessarily going through the site because we don't need your attention or to sell you anything.


### License

Gancio is distributed by an [AGPL-3.0 Licence](https://www.gnu.org/licenses/agpl-3.0.en.html).
