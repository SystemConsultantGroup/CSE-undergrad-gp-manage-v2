module.exports = function(sequelize, DataTypes) {
    var Board = sequelize.define("Board", {
        title: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false
        },
        comment: {
            type: DataTypes.STRING,
            defaultValue: ""
        }
    }, {
        tableName: 'cs_board_category',
        comment: "cs 게시판 카테고리 분류"
    });

    Board.associate = function(models) {
        Board.hasMany(models.BoardPost);
    };

    return Board;
};