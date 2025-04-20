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
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("pending", "completed", "failed", "refunded"),
        defaultValue: "pending",
      },
      transaction_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      paid_at: {
        type: DataTypes.DATE,
      },
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
