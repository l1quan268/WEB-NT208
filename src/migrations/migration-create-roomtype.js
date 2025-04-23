"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("RoomTypes", {
      room_type_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      homestay_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: "Homestays",
          key: "homestay_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      type_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      bedroom_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      toilet_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      max_adults: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      max_children: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      max_guests: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      min_adults: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      price_per_night: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("RoomTypes", ["homestay_id"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("RoomTypes");
  },
};
