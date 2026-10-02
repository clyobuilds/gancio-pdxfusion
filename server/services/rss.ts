import { type H3Event, setHeader } from 'h3'
import { DateTime } from 'luxon'
import fs from 'fs'
import pug from 'pug'
import type { InferAttributes } from '@sequelize/core'
import { publicSettings, type Event } from '../services'
import { runtimeResolve } from './config'

const rssTemplateStr = fs.readFileSync(runtimeResolve('./static/rss.pug'), 'utf-8')
export const rssTemplate = pug.compile(rssTemplateStr)

export function exportFeed(evt: H3Event, events: InferAttributes<Event, { omit: never }>[], title = publicSettings.title, link = `${publicSettings.baseurl}/feed/rss`) {
  const opt = {
    zone: publicSettings.instance_timezone,
    locale: publicSettings.instance_locale
  }

  function unixFormat(timestamp: number, format = 'EEEE d MMMM HH:mm') {
    return DateTime.fromSeconds(timestamp, opt).toFormat(format)
  }

  setHeader(evt, 'Content-Type', 'application/rss+xml; charset=UTF-8')
  return rssTemplate({ events, settings: publicSettings, unixFormat, title, link })
}