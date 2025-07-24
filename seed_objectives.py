import asyncpg
import asyncio

# Paste this content directly from your learningObjectives.js (converted to Python)
learning_objectives = [
    {
        "topic": "Basic Syntax & Data Types",
        "objectives": [
            "Define and use variables in Python.",
            "Identify and use different data types: integers, floats, strings, and booleans.",
            "Convert between different data types using type casting.",
            "Perform basic arithmetic operations (+, -, *, /, //, %, **).",
            "Use string operations like concatenation, slicing, and formatting.",
        ]
    },
    {
        "topic": "Control Flow & Logic",
        "objectives": [
            "Write conditional statements using if, elif, and else.",
            "Use logical operators (and, or, not) to create complex conditions.",
            "Implement loops using for and while to automate repetitive tasks.",
            "Utilize the break and continue statements for loop control.",
            "Use nested loops to handle multi-dimensional data.",
        ]
    },
    {
        "topic": "Functions & Modular Programming",
        "objectives": [
            "Define and call functions using def with parameters and return values.",
            "Use default and keyword arguments in function calls.",
            "Understand variable scope (global vs local variables).",
            "Use lambda functions for concise anonymous functions.",
            "Organize code into modules and import functions from other files.",
            "Use the __name__ variable to control script execution.",
        ]
    },
    {
        "topic": "Data Structures: Lists, Tuples, Sets, and Dictionaries",
        "objectives": [
            "Create and manipulate lists (indexing, slicing, appending, removing).",
            "Iterate over lists using loops and list comprehensions.",
            "Understand and use tuples for immutable data storage.",
            "Differentiate between lists, sets, and dictionaries and when to use each.",
            "Create and manipulate dictionaries (adding, modifying, and retrieving values).",
            "Use dictionary comprehensions for efficient data handling.",
            "Use the zip() function to pair elements from multiple lists.",
        ]
    },
    {
        "topic": "Working with Files & Input/Output",
        "objectives": [
            "Read and write files using Python’s open() function.",
            "Handle user input using the input() function.",
            "Format strings dynamically using f-strings and .format().",
            "Work with CSV files using the csv module.",
        ]
    },
    {
        "topic": "Error Handling & Debugging",
        "objectives": [
            "Use try and except blocks to handle errors gracefully.",
            "Understand common Python errors (SyntaxError, ValueError, TypeError, etc.).",
            "Debug Python scripts using print statements and debugging tools.",
            "Use finally and else clauses in error handling.",
        ]
    },
    {
        "topic": "Object-Oriented Programming (OOP)",
        "objectives": [
            "Define and use classes and objects in Python.",
            "Understand instance variables and class variables.",
            "Use constructors (__init__) and destructors (__del__).",
            "Implement inheritance and method overriding.",
            "Use Python's built-in super() function.",
            "Understand polymorphism and encapsulation.",
            "Use @classmethod and @staticmethod decorators.",
        ]
    },
    {
        "topic": "Python Libraries & Modules",
        "objectives": [
            "Import and use Python's built-in modules like math, random, datetime, and os.",
            "Install and use external libraries using pip.",
            "Work with the datetime module for time manipulation.",
            "Use the json module to parse and store JSON data.",
            "Work with APIs using the requests module.",
        ]
    },
    {
        "topic": "Advanced Data Handling",
        "objectives": [
            "Use list comprehensions for efficient data transformation.",
            "Understand and use generators (yield) for memory-efficient loops.",
            "Handle large datasets using Python's built-in pandas module.",
            "Sort and filter data using Python’s sorted() and filtering functions.",
        ]
    },
    {
        "topic": "Regular Expressions & String Manipulation",
        "objectives": [
            "Use the re module for pattern matching.",
            "Extract information from text using regex (findall, search, match).",
            "Replace text using regex (sub method).",
            "Validate user input with regular expressions.",
        ]
    },
    {
        "topic": "Working with Databases",
        "objectives": [
            "Use SQLite with Python for simple databases.",
            "Perform CRUD (Create, Read, Update, Delete) operations using sqlite3.",
            "Use parameterized queries to prevent SQL injection.",
        ]
    },
    {
        "topic": "Introduction to Automation",
        "objectives": [
            "Use Python for task automation (e.g., renaming files, automating emails).",
            "Work with the os and shutil modules for file management.",
            "Automate web browser interactions using selenium.",
        ]
    },
    {
        "topic": "Introduction to Machine Learning",
        "objectives": [
            "Understand the basics of machine learning.",
            "Use numpy and pandas for data manipulation.",
            "Train a simple model using scikit-learn.",
        ]
    }
]

DATABASE_URL = "postgres://postgres:abAB%23us8096838028@database-1-instance-1.ci38iy8iegvd.us-east-1.rds.amazonaws.com:5432/postgres"

async def insert_objectives():
    conn = await asyncpg.connect(DATABASE_URL)
    for group in learning_objectives:
        topic = group["topic"]
        for objective in group["objectives"]:
            try:
                await conn.execute("""
                    INSERT INTO cicada.learning_objectives (topic, objective)
                    VALUES ($1, $2)
                    ON CONFLICT DO NOTHING
                """, topic, objective)
            except Exception as e:
                print(f"Error inserting {objective}: {e}")
    await conn.close()
    print("✅ Learning objectives inserted.")

if __name__ == "__main__":
    asyncio.run(insert_objectives())
