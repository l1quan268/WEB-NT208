"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      Payment.belongsTo(models.Booking, { foreignKey: "booking_id" });
      Payment.belongsTo(models.User, { foreignKey: "user_id" });
    }
  }
  
  Payment.init(
    {
      payment_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      booking_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: true, // **FIX: Allow null for guest bookings**
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pending", "completed", "failed", "refunded"),
        defaultValue: "pending",
      },
      // **ADD: Missing payment_method field**
      payment_method: {
        type: DataTypes.ENUM("cash", "vnpay", "momo", "bank_transfer"),
        allowNull: false,
        defaultValue: "cash"
      },
      transaction_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // **ADD: Optional fields for more data**
      gateway_response: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "JSON response from payment gateway"
      }
    },
    {
      sequelize,
      modelName: "Payment",
      tableName: "payments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );
  
  return Payment;
};