module.exports = function(sequelize, DataTypes) {
    var StudentFile = sequelize.define('StudentFile', {
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
        time: {
            type: DataTypes.DATE,
            allowNull: false
        },
        ip: {
            type: DataTypes.STRING(127),
            allowNull: false
        },                
    }, {
        tableName: 'cssys_work_student_file',
        comment: '논문/작품 파일',
        classMethods: {
            associate: function(models) {
                StudentFile.belongsTo(models.User);   
            }
        }
    });
    return StudentFile;
};