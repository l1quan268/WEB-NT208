"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    static associate(models) {
      Booking.belongsTo(models.User, { foreignKey: "user_id" });
      Booking.belongsTo(models.Homestay, { foreignKey: "homestay_id" });
      Booking.belongsTo(models.RoomType, { foreignKey: "room_type_id" });
      Booking.hasOne(models.Payment, { foreignKey: "booking_id" });
    }
  }
  Booking.init(
    {
      booking_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      homestay_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      room_type_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      booking_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      check_in_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      check_out_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      adults: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      children: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      total_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pending", "rejected", "canceled", "completed"),
        defaultValue: "pending",
      },
    },
    {
      sequelize,
      modelName: "Booking",
      tableName: "bookings",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );
  return Booking;
};
