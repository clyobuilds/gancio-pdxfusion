import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import slugify from 'slugify'
import { Umzug, SequelizeStorage } from 'umzug'
import { useLogger } from '../lib/logger'

import {
  Sequelize,
  DataTypes,
  Op,
  Model,
  type BelongsToManySetAssociationsMixin,
  type BelongsToSetAssociationMixin,
  type BelongsToManyRemoveAssociationMixin,
  type BelongsToManyGetAssociationsMixin,
  type BelongsToManyAddAssociationsMixin,
  type AggregateOptions,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type NonAttribute,
  type InferAttributesOptions,
  type AbstractDialect,
  type Options,
  fn,
  sql,
  col
} from '@sequelize/core'

import {
  Attribute,
  HasMany,
  NotNull,
  Table,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  AutoIncrement,
  // BeforeCreate,
  // BeforeUpsert,
  Index,
  Unique,
  BeforeSave,
  // AllowNull,
  BelongsToMany,
  // BelongsTo,
  Default,
  BeforeCreate,
  BelongsTo
} from '@sequelize/core/decorators-legacy'

import { get as getConfig, runtimeResolve } from '../services/config'
import type { APActor, APEvent, APNote, PostalAddress } from '../federation/types'
import { EventStatusEnum } from '../federation/types'
import type { SecretSettings, Settings } from '~~/shared/types/settings'
import z from 'zod'
const config = getConfig()
const log = useLogger('sequelize')

export let sequelize: Sequelize | undefined

export async function connect() {
  if (sequelize) {
    return sequelize
  }
  if ('sqlite3' === config.db.dialect) {
    log.info(`Connecting to sqlite db ${config.db.storage}`)
  } else {
    log.info(`Connecting to ${config.db.dialect} host: ${config.db.host}:${config.db.port} database: ${config.db.database}`)
  }

  try {
    sequelize = new Sequelize(config.db as Options<AbstractDialect>)
    await sequelize.authenticate()
    log.info('Connection has been established successfully.')
    sequelize.addModels([Announcement, Place, Event, Tag, User, Instance, APUser, Setting, Collection, Filter, Resource, Page, Notification, Message, OAuthToken, APKey])
  } catch (error) {
    console.error('Unable to connect to the database:', config.db, error)
    process.exit(1)
  }

  User.addScope('defaultScope', { attributes: { exclude: ['password', 'recover_code'] } })
  User.addScope('withRecoverCode', { attributes: { exclude: ['password'] } })
  User.addScope('withPassword', {})

  return sequelize
}

export async function runMigrations() {
  const migrationsPath = runtimeResolve('./migrations')
  if (!sequelize) return
  const umzug = new Umzug({
    storage: new SequelizeStorage({ sequelize }),
    migrations: { glob: `${migrationsPath}/*.js` },
    context: sequelize.queryInterface,
    logger: console
  })
  try {
    await umzug.up()
  } catch (e) {
    log.error('Error running migrations ', e)
    throw e
  }
}

export function jsonPath(expression: string, path: ReadonlyArray<string | number>) {
  // Sequelize complains JSON access is not supported in sqlite3, but in fact it is.
  return sequelize?.dialect.name === 'sqlite3'
    ? fn('JSON_EXTRACT', col(expression), '$.' + path.join('.'))
    : sql.jsonPath(expression, path)
}

@Table({
  tableName: 'announcements',
  timestamps: true
})
export class Announcement extends Model<
  InferAttributes<Announcement>,
  InferCreationAttributes<Announcement>
> {
  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @PrimaryKey
  @AutoIncrement
  declare readonly id: CreationOptional<number>

  @CreatedAt
  declare readonly createdAt: CreationOptional<Date>

  @UpdatedAt
  declare readonly updatedAt: CreationOptional<Date>

  @Attribute(DataTypes.STRING)
  @NotNull
  declare title: string

  @Attribute(DataTypes.STRING)
  declare announcement: string

  @Attribute(DataTypes.BOOLEAN)
  declare visible: boolean
}

@Table({
  tableName: 'messages'
})
export class Message extends Model<
  InferAttributes<Message>,
  InferCreationAttributes<Message>
> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>

  @Attribute(DataTypes.TEXT)
  @NotNull
  declare message: string

  @Attribute(DataTypes.ENUM(['AUTHOR', 'ADMIN', 'ANON', 'REGISTERED']))
  declare author: 'AUTHOR' | 'ADMIN' | 'ANON' | 'REGISTERED'

  @Attribute(DataTypes.BOOLEAN)
  declare is_author_visible: boolean // is this message visible to the author?

  @Attribute({
    type: DataTypes.INTEGER.UNSIGNED,
    references: { table: 'events', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  })
  declare eventId: number

  @BelongsTo(() => Event, { foreignKey: 'eventId', targetKey: 'id' })
  declare event: NonAttribute<Event>
}

export interface Media {
  /** use as alt attribute */
  name?: string
  url?: string
  height?: number
  width?: number
  size?: number
  image?: string | Blob | File

  /** https://docs-p.joinmastodon.org/spec/activitypub/#focalPoint */
  focalpoint?: [number, number]
}

export type EventStatus = typeof EventStatusEnum[number]

export type LDSignature = {
  '@context': 'https://w3id.org/identity/v1'
  'creator': string
  'created': string
  'signatureValue': string
}

/**
 * this is the v1 recurrent type
 */
export const RecurrentSchema = z.object({
  frequency: z.enum(['1w', '2w', '1m', '2m', '1y']),
  // only meaningful for monthly/yearly events, the event form does not send it for weekly ones
  type: z.enum(['ordinal', '-1', '1', '2', '3', '4']).default('ordinal'),
  // no occurrences are created after this time (unix timestamp)
  until: z.number().int().positive().nullish()
})
export type Recurrent = z.infer<typeof RecurrentSchema>

@Table({
  tableName: 'events',
  timestamps: true
})
export class Event extends Model<
  InferAttributes<Event>,
  InferCreationAttributes<Event>
> {
  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @PrimaryKey
  @AutoIncrement
  declare readonly id: CreationOptional<number>

  @CreatedAt
  declare readonly createdAt: CreationOptional<Date>

  @UpdatedAt
  declare readonly updatedAt: CreationOptional<Date>

  /**  title of the event */
  @Attribute(DataTypes.STRING)
  @NotNull
  declare title: string

  @Attribute(DataTypes.ENUM(EventStatusEnum))
  @Default('EventScheduled')
  @NotNull
  declare status: CreationOptional<EventStatus>

  @Attribute(DataTypes.STRING)
  @Index
  @Unique
  declare slug: CreationOptional<string>

  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @Index
  declare start_datetime: number

  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @Index
  declare end_datetime: CreationOptional<number | null>

  @Attribute(DataTypes.JSON)
  declare media?: CreationOptional<Media[] | null>

  @Attribute(DataTypes.TEXT)
  declare description?: string

  @Attribute(DataTypes.BOOLEAN)
  declare is_visible: boolean

  @Attribute(DataTypes.JSON)
  declare online_locations?: CreationOptional<string[] | null>

  // what it costs to attend, free text such as "$5-15" (optional)
  @Attribute(DataTypes.STRING)
  declare cost?: CreationOptional<string | null>

  @Attribute(DataTypes.JSON)
  declare recurrent?: CreationOptional<Recurrent | null>

  @Attribute(DataTypes.JSON)
  declare ld_signature: CreationOptional<LDSignature>

  @Attribute(DataTypes.JSON)
  declare ap_object: CreationOptional<APEvent>

  @Attribute(DataTypes.JSON)
  declare likes: CreationOptional<Array<object | string>>

  @Attribute(DataTypes.JSON)
  declare boost: CreationOptional<Array<object>>

  /** represent the AP URI */
  @Attribute(DataTypes.STRING)
  @Index
  declare ap_id?: CreationOptional<string | null>

  @Attribute({
    type: DataTypes.INTEGER.UNSIGNED,
    references: { table: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  })
  declare userId: CreationOptional<number | null>

  @BelongsTo(() => User, { foreignKey: 'userId', targetKey: 'id' })
  declare user: NonAttribute<User>

  @Attribute({
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    references: { table: 'events', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  })
  declare parentId: number | null

  declare parent?: NonAttribute<Event>

  @HasMany(() => Event, { foreignKey: 'parentId', inverse: { as: 'parent' } })
  declare children?: NonAttribute<Event[]>

  @Attribute({
    type: DataTypes.INTEGER.UNSIGNED,
    references: { table: 'places', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  })
  declare placeId?: CreationOptional<number>

  @BelongsTo(() => Place, { foreignKey: 'placeId' })
  declare place: NonAttribute<Place>

  @BelongsToMany(() => Tag, { through: 'event_tags', inverse: { as: 'events' } })
  declare tags: NonAttribute<Tag[]>

  @Attribute({
    type: DataTypes.STRING,
    references: { table: 'ap_users', key: 'ap_id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  })
  declare apUserApId: CreationOptional<string>

  @BelongsTo(() => APUser, { foreignKey: 'apUserApId', targetKey: 'ap_id' })
  declare APUser: NonAttribute<APUser>

  @HasMany(() => Message, { foreignKey: 'eventId', sourceKey: 'id' })
  declare messages: NonAttribute<Message[]>

  @HasMany(() => Resource, { foreignKey: 'eventId', sourceKey: 'id' })
  declare resources: NonAttribute<Resource[]>

  // the mixins Sequelize automatically provides
  declare setTags: BelongsToManySetAssociationsMixin<Tag, string>
  declare setPlace: BelongsToSetAssociationMixin<Place, number>

  // @BeforeDestroy
  // static async removeImg(instance: Event) {
  //   // remove the image files (normal and thumb) associated with this event
  //   // if no image is associated, do nothing
  //   if (!instance.media || instance.media.length === 0 || !instance.media[0]?.url) {
  //     return
  //   }
  //   for (const media of instance.media) {
  //     if (!media?.url) continue
  //     // const thumbPath = path.resolve(config.upload_path, 'thumb', path.basename(media.url))
  //     // const normalPath = path.resolve(config.upload_path, path.basename(media.url))
  //     // log.info(`Removing event images for event ${instance.id}: `, normalPath, thumbPath)
  //     // await Promise.allSettled([
  //     //   fs.unlink(normalPath),
  //     //   fs.unlink(thumbPath)
  //     // ])
  //   }
  // }

  @BeforeCreate
  static async generateSlug(event: Event) {
    if (event.title && !event.slug) {
      const baseSlug = slugify(event.title, { lower: true, strict: true })
      let slug = baseSlug
      let count = 1

      // Ensure slug is unique
      while (
        await Event.findOne({
          where: { slug, id: { [Op.ne]: event.id } }
        }) // skip self in case of update
      ) {
        slug = `${baseSlug}-${count++}`
      }

      event.slug = slug
    }
  }
}

@Table({
  tableName: 'tags'
})
export class Tag extends Model<
  InferAttributes<Tag>,
  InferCreationAttributes<Tag>
> {
  @Attribute(DataTypes.STRING)
  @PrimaryKey
  @Index
  @Unique
  declare tag: string

  /** normalizedTag is used for search, it is the normalized version of tag (lowercase, accents removed, etc.) */
  @Attribute(DataTypes.STRING)
  declare normalizedTag: string

  @BelongsToMany(() => Event, { through: 'event_tags' })
  declare events: NonAttribute<Event[]>

  // the mixins Sequelize automatically provides
  // declare getEvents: BelongsToManySetAssociationsMixin<Tag, Event[]>
  // declare removeEvents: BelongsToManySetAssociationsMixin<Tag, Event[]>
  // declare setPlace: BelongsToSetAssociationMixin<Place, number>
}

@Table({
  tableName: 'places',
  timestamps: true
})
export class Place extends Model<
  InferAttributes<Place>,
  InferCreationAttributes<Place>
> {
  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @PrimaryKey
  @AutoIncrement
  declare readonly id: CreationOptional<number>

  @Attribute(DataTypes.STRING)
  @Index
  @Unique({ name: 'unique_place_name', msg: 'error.place_name_exists' })
  @NotNull
  declare name: string

  @CreatedAt
  declare readonly createdAt: CreationOptional<Date>

  @UpdatedAt
  declare readonly updatedAt: CreationOptional<Date>

  @Attribute(DataTypes.STRING)
  @Index
  @Unique({ name: 'unique_place_name', msg: 'error.place_name_exists' })
  @Default('')
  declare ap_id: CreationOptional<string>

  @Attribute(DataTypes.STRING)
  declare address: CreationOptional<string>

  @Attribute(DataTypes.JSON)
  declare postal_address: CreationOptional<PostalAddress>

  @Attribute(DataTypes.DOUBLE)
  declare latitude?: CreationOptional<number | null>

  @Attribute(DataTypes.DOUBLE)
  declare longitude?: CreationOptional<number | null>

  @HasMany(() => Event, /* foreign key */ 'placeId')
  declare events?: NonAttribute<Event[]>

  // the mixins Sequelize automatically provides
  declare getEvents: BelongsToManyGetAssociationsMixin<Event>
  declare addEvents: BelongsToManyAddAssociationsMixin<Event, number>
  declare removeEvents: BelongsToManyRemoveAssociationMixin<Event[], number>
}

export type UserRole = 'admin' | 'editor' | 'user'

@Table({
  tableName: 'users'
})
export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @PrimaryKey
  @AutoIncrement
  declare readonly id: CreationOptional<number>

  @Attribute(DataTypes.STRING)
  @NotNull
  @Index
  @Unique({
    name: 'unique_mail',
    msg: 'error.email_taken'
  })
  declare email: string

  @Attribute(DataTypes.STRING)
  declare password: CreationOptional<string>

  @Attribute(DataTypes.STRING)
  declare recover_code: CreationOptional<string>

  @Attribute(DataTypes.BOOLEAN)
  declare is_active: boolean

  @Attribute(DataTypes.BOOLEAN)
  @Default(true)
  declare to_notify: CreationOptional<boolean>

  @Attribute(DataTypes.STRING)
  declare description: CreationOptional<string>

  @Attribute(DataTypes.ENUM(['admin', 'editor', 'user']))
  declare role: UserRole

  @HasMany(() => Event, { foreignKey: 'userId', sourceKey: 'id' })
  declare events?: NonAttribute<Event[]>

  @CreatedAt
  declare readonly createdAt: CreationOptional<Date>

  @UpdatedAt
  declare readonly updatedAt: CreationOptional<Date>

  async generateRecoverCode() {
    this.recover_code = crypto.randomUUID()
    await this.save()
  }

  @BeforeSave
  static hashPassword(instance: User) {
    if (instance.changed('password')) {
      const password = instance.getDataValue('password')
      if (password) {
        const hashedPassword = bcrypt.hashSync(password, 10)
        instance.setDataValue('password', hashedPassword)
      }
    }
  }
}

@Table({
  tableName: 'instances'
})
export class Instance extends Model<
  InferAttributes<Instance>,
  InferCreationAttributes<Instance>
> {
  @Attribute(DataTypes.STRING)
  @PrimaryKey
  declare domain: string

  @Attribute(DataTypes.STRING)
  declare name: string

  @Attribute(DataTypes.BOOLEAN)
  declare blocked: boolean

  @Attribute(DataTypes.JSON)
  declare data: string

  @Attribute(DataTypes.STRING)
  declare applicationActor?: string

  @HasMany(() => APUser, { foreignKey: 'instanceDomain', sourceKey: 'domain' })
  declare APUsers?: NonAttribute<APUser[]>

  // @HasMany(() => Event, /* foreign key */ 'placeId')
  // declare events?: NonAttribute<Event[]>;
}

@Table({
  tableName: 'ap_users'
})
export class APUser extends Model<
  InferAttributes<APUser>,
  InferCreationAttributes<APUser>
> {
  @Attribute(DataTypes.STRING)
  @PrimaryKey
  declare ap_id: string

  @CreatedAt
  declare readonly createdAt: CreationOptional<Date>

  @UpdatedAt
  declare readonly updatedAt: CreationOptional<Date>

  @Attribute(DataTypes.BOOLEAN)
  declare follower: CreationOptional<boolean>

  @Attribute(DataTypes.BOOLEAN)
  declare following: CreationOptional<boolean>

  @Attribute(DataTypes.BOOLEAN)
  declare trusted: CreationOptional<boolean>

  @Attribute(DataTypes.BOOLEAN)
  declare blocked: CreationOptional<boolean>

  @Attribute(DataTypes.JSON)
  declare object: APActor

  @Attribute({
    type: DataTypes.STRING,
    references: { table: 'instances', key: 'domain' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  })
  declare instanceDomain: string

  @BelongsTo(() => Instance, { foreignKey: 'instanceDomain', targetKey: 'domain' })
  declare instance?: NonAttribute<Instance>

  declare setInstance: BelongsToSetAssociationMixin<Instance, number>

  @HasMany(() => Event, { foreignKey: 'apUserApId', sourceKey: 'ap_id' })
  declare events?: NonAttribute<Event[]>

  @HasMany(() => Resource, { foreignKey: 'activitypub_id', sourceKey: 'ap_id' })
  declare resources?: NonAttribute<Resource[]>

  @HasMany(() => APKey, { foreignKey: 'apUserApId', sourceKey: 'ap_id' })
  declare keys?: NonAttribute<APKey[]>
}

export const KeyTypeEnum = ['ed25519', 'rsa-v1_5-sha256', 'rsa-pss-sha512'] as const
export type KeyType = typeof KeyTypeEnum[number]

@Table({
  tableName: 'ap_keys',
  timestamps: false
})
export class APKey extends Model<
  InferAttributes<APKey>,
  InferCreationAttributes<APKey>
> {
  @Attribute(DataTypes.STRING)
  @PrimaryKey
  declare ap_id: string

  @Attribute(DataTypes.ENUM(...KeyTypeEnum))
  declare type: KeyType

  @Attribute(DataTypes.BLOB)
  declare public_key: Uint8Array

  @Attribute({
    type: DataTypes.STRING,
    references: { table: 'ap_users', key: 'ap_id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  })
  declare apUserApId: string

  @BelongsTo(() => APUser, { foreignKey: 'apUserApId', targetKey: 'ap_id' })
  declare APUser: NonAttribute<APUser>
}

@Table({
  tableName: 'settings'
})
export class Setting extends Model<
  InferAttributes<Setting>,
  InferCreationAttributes<Setting>
> {
  @Attribute(DataTypes.STRING)
  @PrimaryKey
  declare key: keyof Settings | keyof SecretSettings

  @Attribute(DataTypes.JSON)
  declare value: string | number | boolean | object | null

  @Attribute(DataTypes.BOOLEAN)
  @Default(false)
  declare is_secret: boolean

  @CreatedAt
  declare readonly createdAt: CreationOptional<Date>

  @UpdatedAt
  declare readonly updatedAt: CreationOptional<Date>
}

@Table({
  tableName: 'collections',
  timestamps: true
})
export class Collection extends Model<
  InferAttributes<Collection>,
  InferCreationAttributes<Collection>
> {
  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @PrimaryKey
  @AutoIncrement
  declare readonly id: CreationOptional<number>

  @Attribute(DataTypes.STRING)
  @Unique
  @Index
  @NotNull
  declare name: string

  @Attribute(DataTypes.BOOLEAN) // not used yet
  declare isActor: boolean

  @Attribute(DataTypes.BOOLEAN) // is this collection shown in the home page navbar? //TODO: rename in showInNavBar or showInHome?
  declare isTop: boolean

  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @Index
  declare sortIndex: CreationOptional<number>

  @CreatedAt
  declare readonly createdAt: CreationOptional<Date>

  @UpdatedAt
  declare readonly updatedAt: CreationOptional<Date>

  @BeforeCreate
  static async autoincrementSortIndex(collection: Collection, options: AggregateOptions<InferAttributesOptions<Collection>>) {
    const maxSort: number | null = await Collection.max('sortIndex', { transaction: options.transaction })
    collection.sortIndex = (maxSort ?? 0) + 1
  }

  @HasMany(() => Filter, { foreignKey: 'collectionId', sourceKey: 'id' })
  declare filters?: NonAttribute<Filter[]>
}

@Table({
  tableName: 'filters',
  timestamps: false,
  indexes: [
    { fields: ['collectionId', 'tags', 'places', 'actors'], unique: true }
  ]
})
export class Filter extends Model<
  InferAttributes<Filter>,
  InferCreationAttributes<Filter>
> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>

  @Attribute(DataTypes.BOOLEAN)
  declare negate: boolean

  @Attribute(DataTypes.JSON)
  declare tags: string[] | null

  @Attribute(DataTypes.JSON)
  declare places: { id: number, name: string }[] | null

  @Attribute(DataTypes.JSON)
  declare actors: { ap_id?: string | null }[] | null

  // If collectionId is a foreign key, you may want to add:
  @Attribute(DataTypes.INTEGER)
  declare collectionId: number

  @BelongsTo(() => Collection, { foreignKey: 'collectionId', targetKey: 'id' })
  declare collection?: NonAttribute<Collection>
}

@Table({
  tableName: 'resources'
})
export class Resource extends Model<
  InferAttributes<Resource>,
  InferCreationAttributes<Resource>
> {
  @Attribute(DataTypes.STRING)
  @PrimaryKey
  declare activitypub_id: string

  @CreatedAt
  declare readonly createdAt: CreationOptional<Date>

  @UpdatedAt
  declare readonly updatedAt: CreationOptional<Date>

  @Attribute(DataTypes.BOOLEAN)
  declare hidden: CreationOptional<boolean>

  @Attribute(DataTypes.JSON)
  declare data: APNote // @todo

  @Attribute({
    type: DataTypes.STRING,
    references: { table: 'ap_users', key: 'ap_id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  })
  declare apUserApId: string

  @BelongsTo(() => APUser, { foreignKey: 'apUserApId', targetKey: 'ap_id' })
  declare APUser: NonAttribute<APUser>

  @Attribute({
    type: DataTypes.INTEGER.UNSIGNED,
    references: { table: 'events', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  })
  declare eventId: number

  @BelongsTo(() => Event, { foreignKey: 'eventId', targetKey: 'id' })
  declare event?: NonAttribute<Event>
}

@Table({
  tableName: 'pages',
  timestamps: true
})
export class Page extends Model<
  InferAttributes<Page>,
  InferCreationAttributes<Page>
> {
  @Attribute(DataTypes.INTEGER.UNSIGNED)
  @PrimaryKey
  @AutoIncrement
  declare readonly id: CreationOptional<number>

  @Attribute(DataTypes.STRING)
  declare title: string

  @Attribute(DataTypes.TEXT)
  declare content: string

  @Attribute(DataTypes.BOOLEAN)
  declare visible: boolean

  @Attribute(DataTypes.STRING)
  @Index
  @Unique
  declare slug: string

  @BeforeCreate
  static async generateSlug(page: Page) {
    if (page.title && !page.slug) {
      const baseSlug = slugify(page.title, { lower: true, strict: true })
      let slug = baseSlug
      let count = 1

      // Ensure slug is unique
      while (
        await Page.findOne({
          where: { slug, id: { [Op.ne]: page.id } }
        }) // skip self in case of update
      ) {
        slug = `${baseSlug}-${count++}`
      }

      page.slug = slug
    }
  }

  @CreatedAt
  declare readonly createdAt: CreationOptional<Date>

  @UpdatedAt
  declare readonly updatedAt: CreationOptional<Date>
}

export const NotificationActionEnum = ['Create', 'Update', 'Delete'] as const
export type NotificationAction = typeof NotificationActionEnum[number]

export const NotificationTypeEnum = ['mail', 'admin_email', 'ap'] as const
export type NotificationType = typeof NotificationTypeEnum[number]

@Table({
  tableName: 'notifications',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['action', 'type']
    }
  ]
})
export class Notification extends Model<
  InferAttributes<Notification>,
  InferCreationAttributes<Notification>
> {
  @Attribute(DataTypes.JSON)
  declare filters: { is_visible: boolean, tags?: string[], places: unknown }

  @Attribute(DataTypes.STRING)
  declare email: string

  @Attribute(DataTypes.STRING)
  declare remove_code: string

  @Attribute(DataTypes.ENUM(...NotificationActionEnum))
  declare action: NotificationAction

  @Attribute(DataTypes.ENUM(...NotificationTypeEnum))
  declare type: NotificationType
}

@Table({
  tableName: 'oauth_tokens',
  timestamps: false
})
export class OAuthToken extends Model<
  InferAttributes<OAuthToken>,
  InferCreationAttributes<OAuthToken>
> {
  @Attribute(DataTypes.STRING)
  @PrimaryKey
  declare accessToken: string

  @Attribute(DataTypes.DATE)
  declare accessTokenExpiresAt: Date

  @Attribute(DataTypes.STRING)
  declare refreshToken: string

  @Attribute(DataTypes.DATE)
  declare refreshTokenExpiresAt: Date

  @Attribute(DataTypes.STRING)
  declare scope: string

  @Attribute({
    type: DataTypes.INTEGER.UNSIGNED,
    references: { table: 'users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  })
  declare userId: number

  @BelongsTo(() => User, { foreignKey: 'userId', targetKey: 'id' })
  declare user: NonAttribute<User>
}
