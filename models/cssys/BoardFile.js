module.exports = function(sequelize, DataTypes) {
    var BoardFile = sequelize.define('BoardFile', {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: '업로드한 원래 파일명'
        },
        path: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: '저장한 경로 또는 파일명'
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false
        },
        size: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        downs: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        time: {
            type: DataTypes.DATE,
            allowNull: false
        },
        ip: {
            type: DataTypes.STRING(127),
            allowNull: false
        },
        last_access: {
            type: DataTypes.DATE,
            comment: '마지막 파일 접근 시간'
        }
    }, {
        tableName: 'cssys_board_file',
        comment: '게시판 게시물 첨부 파일',
        classMethods: {
            associate: function(models) {
                BoardFile.belongsTo(models.User);
                BoardFile.belongsTo(models.Board);
                BoardFile.belongsTo(models.BoardPost);
            }
        }
    });
    return BoardFile;
};