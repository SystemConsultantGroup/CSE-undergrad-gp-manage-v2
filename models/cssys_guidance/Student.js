module.exports = function(sequelize, DataTypes) {
    var Student = sequelize.define('Student', {
        term: {
            type: DataTypes.INTEGER(2),
            allowNull: false,
            defaultValue: 1,
            comment: '학생의 학기'
        },
        status: {
            type: DataTypes.INTEGER(1),
            allowNull: false,
            defaultValue: 0,
            comment: '0은 재학, 1은 휴학, 2는 수료, 3은 졸업'
        },
        doublemajor:{
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: 0,
            comment: '단일전공(0) or 복수전공(1)'
        },
        note: {
            type: DataTypes.TEXT,
            comment: '메모'
        },
        state: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: '0: 없음, 1: 응답대기중, 2: 배정',
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
        tableName: 'cssys_guidance_student',
        comment: '학생 정보'
    });

    Student.associate = function(models) {
        Student.belongsTo(models.User);
        Student.belongsTo(models.Prof);
    };

    return Student;
};
