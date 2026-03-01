module.exports = function (sequelize, DataTypes) {
  var User = sequelize.define(
    'User',
    {
      ids: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        comment: 'Sequelize id 컬럼이랑 네이밍 중복되서 ids로 함',
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'sha256 hash 사용, 생성시 http://www.xorbin.com/tools/sha256-hash-calculator 싸이트 참조',
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      comment: {
        type: DataTypes.TEXT,
        defaultValue: '',
      },
      time: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      ip: {
        type: DataTypes.STRING(15),
        allowNull: false,
        validate: {
          isIPv4: true,
        },
      },
    },
    {
      tableName: 'cs_user',
      comment: 'cs 유저',
    },
  );

  User.associate = function (models) {
    User.hasMany(models.BoardPost);
    User.hasMany(models.BoardFile);
  };

  return User;
};
