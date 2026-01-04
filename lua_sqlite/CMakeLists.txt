cmake_minimum_required(VERSION 3.10)
project(lsqlite3_android C)

# -------------------------------------------------
# Global settings
# -------------------------------------------------
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# -------------------------------------------------
# Lua headers (HEADERS ONLY, NO LINKING)
# MUST be passed via -DLUA_INCLUDE_DIR=...
# -------------------------------------------------
if(NOT DEFINED LUA_INCLUDE_DIR)
  message(FATAL_ERROR "LUA_INCLUDE_DIR not set. Pass -DLUA_INCLUDE_DIR=/path/to/lua")
endif()

if(NOT EXISTS "${LUA_INCLUDE_DIR}/lua.h")
  message(FATAL_ERROR "lua.h not found in ${LUA_INCLUDE_DIR}")
endif()

# -------------------------------------------------
# SQLite amalgamation (STATIC, with FTS/JSON/RTREE)
# -------------------------------------------------
if(NOT EXISTS "${CMAKE_SOURCE_DIR}/sqlite3.c")
  message(FATAL_ERROR "sqlite3.c not found in ${CMAKE_SOURCE_DIR}")
endif()

add_library(sqlite3 STATIC sqlite3.c)

target_compile_definitions(sqlite3 PRIVATE
  SQLITE_ENABLE_FTS5
  SQLITE_ENABLE_FTS4
  SQLITE_ENABLE_FTS3
  SQLITE_ENABLE_JSON1
  SQLITE_ENABLE_RTREE
  SQLITE_THREADSAFE=1
  SQLITE_DEFAULT_FOREIGN_KEYS=1
)

target_include_directories(sqlite3 PRIVATE
  ${CMAKE_SOURCE_DIR}
)

set_target_properties(sqlite3 PROPERTIES
  POSITION_INDEPENDENT_CODE ON
)

# -------------------------------------------------
# lsqlite3 Lua module (SHARED)
# -------------------------------------------------
if(NOT EXISTS "${CMAKE_SOURCE_DIR}/lsqlite3.c")
  message(FATAL_ERROR "lsqlite3.c not found in ${CMAKE_SOURCE_DIR}")
endif()

add_library(lsqlite3 SHARED lsqlite3.c)

target_include_directories(lsqlite3 PRIVATE
  ${CMAKE_SOURCE_DIR}     # sqlite3.h
  ${LUA_INCLUDE_DIR}      # lua.h, lauxlib.h, lualib.h
)

set_target_properties(lsqlite3 PROPERTIES
  POSITION_INDEPENDENT_CODE ON
  OUTPUT_NAME "lsqlite3"
  PREFIX ""               # produces lsqlite3.so (NOT liblsqlite3.so)
)

# -------------------------------------------------
# REQUIRED for Android: allow unresolved lua_* symbols
# -------------------------------------------------
target_link_options(lsqlite3 PRIVATE
  "-Wl,--allow-shlib-undefined"
)

# -------------------------------------------------
# Link ONLY non-Lua system libraries
# -------------------------------------------------
target_link_libraries(lsqlite3 PRIVATE
  sqlite3
  m
  dl
)
