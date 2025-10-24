cmake_minimum_required(VERSION 3.10)
project(lsqlite3 C)

# ✅ Output directory same as Lua
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY
    ${CMAKE_CURRENT_SOURCE_DIR}/../android/.cxx/Debug/2x44o286/arm64-v8a/sysroot/lib)

# ✅ Ensure all code built with -fPIC
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# ✅ Build static SQLite (with PIC)
add_library(sqlite3 STATIC sqlite3.c)
set_target_properties(sqlite3 PROPERTIES POSITION_INDEPENDENT_CODE ON)

# ✅ Enable Full Text Search + other useful features
target_compile_definitions(sqlite3 PRIVATE
  SQLITE_ENABLE_FTS3
  SQLITE_ENABLE_FTS4
  SQLITE_ENABLE_FTS5
  SQLITE_ENABLE_JSON1
  SQLITE_ENABLE_RTREE
  SQLITE_THREADSAFE=1
  SQLITE_DEFAULT_FOREIGN_KEYS=1
)

# ✅ Build shared Lua binding
add_library(lsqlite3 SHARED lsqlite3.c)

# ✅ Include directories
target_include_directories(lsqlite3 PUBLIC
  ${CMAKE_CURRENT_SOURCE_DIR}              # sqlite3.h
  ${CMAKE_CURRENT_SOURCE_DIR}/../lua       # lua headers (adjust if needed)
)

# ✅ Link lsqlite3 with sqlite3
target_link_libraries(lsqlite3
  sqlite3
  m
)

message(STATUS "✅ Building lsqlite3 → ${CMAKE_LIBRARY_OUTPUT_DIRECTORY}")



# commands to build  in build folder created in lua_sqlite. Run below command in build
# cmake ..
# cmake --build .
