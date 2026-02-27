module.exports = function (sequelize, DataTypes) {
  var BoardPost = sequelize.define(
    'BoardPost',
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      text: {
        type: DataTypes.TEXT,
      },
      notice: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '공지사항 여부',
      },
      secret: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '비밀글 여부',
      },
      views: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      time: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      ip: {
        type: DataTypes.STRING(127),
        allowNull: false,
      },
    },
    {
      tableName: 'cssys_board_post',
      comment: '게시판 게시물',
    },
  );

  BoardPost.associate = function (models) {
    BoardPost.belongsTo(models.User);
    BoardPost.belongsTo(models.Board);
    BoardPost.belongsTo(models.BoardPost, {
      as: 'Parent',
    });
    BoardPost.hasMany(models.BoardPost, {
      as: 'Childs',
      foreignKey: {
        name: 'ParentId',
      },
    });
    BoardPost.hasMany(models.BoardFile);
  };

  return BoardPost;
};
