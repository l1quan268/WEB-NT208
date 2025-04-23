"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("RoomTypeImages", {
      image_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      room_type_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'RoomTypes',
          key: 'room_type_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      image_url: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      alt_text: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      is_thumbnail: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('RoomTypeImages', ['room_type_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("RoomTypeImages");
  },
};