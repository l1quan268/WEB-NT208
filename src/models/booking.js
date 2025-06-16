"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    static associate(models) {
      Booking.belongsTo(models.User, { foreignKey: "user_id" });
      Booking.belongsTo(models.Homestay, { foreignKey: "homestay_id" });
      Booking.belongsTo(models.RoomType, { foreignKey: "room_type_id" });
      Booking.hasOne(models.Payment, { foreignKey: "booking_id" });
      Booking.hasMany(models.BookingService, { foreignKey: "booking_id" });
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
        allowNull: true,
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
      order_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      guest_email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      guest_phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      guest_address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
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
        defaultValue: 2,
      },
      children: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      payment_method: {
        type: DataTypes.ENUM("cash", "vnpay", "momo", "bank_transfer"),
        allowNull: false,
        defaultValue: "cash",
      },
      payment_status: {
        type: DataTypes.ENUM("pending", "paid", "failed"),
        allowNull: false,
        defaultValue: "pending",
      },
      transaction_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
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
