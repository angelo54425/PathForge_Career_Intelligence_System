import csv

rows = [
    ["program_id", "program_name", "university", "skill_name", "coverage_score"],
    ["CS01", "BSc Computer Science", "University of Rwanda", "Python", 0.9],
    ["CS01", "BSc Computer Science", "University of Rwanda", "SQL", 0.6],
    ["CS01", "BSc Computer Science", "University of Rwanda", "Statistics", 0.5],
    ["CS01", "BSc Computer Science", "University of Rwanda", "Data Cleaning", 0.6],
    ["CS01", "BSc Computer Science", "University of Rwanda", "Data Visualization", 0.5],
    ["CS01", "BSc Computer Science", "University of Rwanda", "Communication", 0.4],
    ["ST01", "BSc Statistics", "University of Rwanda", "Python", 0.6],
    ["ST01", "BSc Statistics", "University of Rwanda", "SQL", 0.4],
    ["ST01", "BSc Statistics", "University of Rwanda", "Statistics", 0.95],
    ["ST01", "BSc Statistics", "University of Rwanda", "Data Cleaning", 0.7],
    ["ST01", "BSc Statistics", "University of Rwanda", "Data Visualization", 0.6],
    ["ST01", "BSc Statistics", "University of Rwanda", "Communication", 0.4],
]

with open("program_skills.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerows(rows)

print("program_skills.csv created successfully")
