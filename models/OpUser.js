module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "opusers",
    {
      user_id: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING,
        defaultValue: 0,
        allowNull: false,
      },
    },
    {
      timestamps: false,
    }
  );
};
