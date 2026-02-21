// cssys 모델 그대로 사용 (관계 일부 수정)
module.exports = function(sequelize, DataTypes) {
    var User = sequelize.define('User', {
        ids: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'sha256 hash 사용, 생성시 http://www.xorbin.com/tools/sha256-hash-calculator 싸이트 참조'
        },
        name: {
            type: DataTypes.STRING,
        },
        email: {
            type: DataTypes.STRING,
        },
        phone: {
            type: DataTypes.STRING,
        },
        type: {
            type: DataTypes.INTEGER(1),
            allowNull: false,
            comment: '0 관리자 1 교수 2 학생'
        },
        major: {
            type: DataTypes.INTEGER(1),
            comment: '0 전자전기공학부, 1 컴퓨터공학과, 2 반도체시스템공학과, 3 소프트웨어학과, 4 정보통신대학, 5 인터랙션사이언스학과'
        },
        time: {
            type: DataTypes.DATE,
            allowNull: false
        },
        ip: {
            type: DataTypes.STRING(127),
            allowNull: false
        }
    }, {
        tableName: 'cssys_user',
        classMethods: {
            associate: function(models) {
                User.hasOne(models.Prof);
                User.hasOne(models.Student);           
            }
        }
    });
    return User;
};