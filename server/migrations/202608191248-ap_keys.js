import { DataTypes } from '@sequelize/core'

export function up ({ context: queryInterface }) {
  return queryInterface.createTable('ap_keys',
    {
      ap_id: {
        type: DataTypes.STRING,
        primaryKey: true
      },
      type: {
        type: DataTypes.ENUM(['ed25519', 'rsa-v1_5-sha256', 'rsa-pss-sha512'])
      },
      public_key: {
        type: DataTypes.BLOB,
        allowNull: false
      },
      apUserApId: {
        type: DataTypes.INTEGER,
        references: { table: 'ap_users', key: 'ap_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }
    })
  }
