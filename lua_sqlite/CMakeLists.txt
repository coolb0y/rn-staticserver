cmake_minimum_required(VERSION 3.10)
project(lsqlite3_android C)

# Force PIC for everything (we will link static libs into a shared module)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# ----- User-provided overrides (optional) -----
# You may pass -DLUA_LIBRARY=/abs/path/to/liblua.a -DLUA_INCLUDE_DIR=/abs/path/to/lua/includes
# If not provided, try sensible defaults in the project directory.
if(NOT DEFINED LUA_LIBRARY)
  # default to liblua.a in the source dir (project root)
  set(LUA_LIBRARY "${CMAKE_SOURCE_DIR}/liblua.a" CACHE PATH "Path to liblua.a or liblua.so")
endif()

if(NOT DEFINED LUA_INCLUDE_DIR)
  # try common locations
  if(EXISTS "${CMAKE_SOURCE_DIR}/lua/out/android/arm64/include/lua.h")
    set(LUA_INCLUDE_DIR "${CMAKE_SOURCE_DIR}/lua/out/android/arm64/include" CACHE PATH "Lua include dir")
  elseif(EXISTS "${CMAKE_SOURCE_DIR}/lua/include/lua.h")
    set(LUA_INCLUDE_DIR "${CMAKE_SOURCE_DIR}/lua/include" CACHE PATH "Lua include dir")
  elseif(EXISTS "${CMAKE_SOURCE_DIR}/include/lua.h")
    set(LUA_INCLUDE_DIR "${CMAKE_SOURCE_DIR}/include" CACHE PATH "Lua include dir")
  else()
    # fallback to source dir (still validated below)
    set(LUA_INCLUDE_DIR "${CMAKE_SOURCE_DIR}" CACHE PATH "Lua include dir")
  endif()
endif()

# Validate inputs early and produce clear errors
if(NOT EXISTS "${LUA_LIBRARY}")
  message(FATAL_ERROR "LUA_LIBRARY not found: ${LUA_LIBRARY}\nEither place liblua.a in the project root or pass -DLUA_LIBRARY=/full/path/liblua.a")
endif()

if(NOT EXISTS "${LUA_INCLUDE_DIR}/lua.h")
  message(FATAL_ERROR "LUA_INCLUDE_DIR does not contain lua.h: ${LUA_INCLUDE_DIR}\nEither pass -DLUA_INCLUDE_DIR=/full/path/to/dir-containing-lua.h or place headers there.")
endif()

message(STATUS "Using LUA_LIBRARY = ${LUA_LIBRARY}")
message(STATUS "Using LUA_INCLUDE_DIR = ${LUA_INCLUDE_DIR}")

# ---- SQLite static library (amalgamation must be in same dir as this CMake) ----
if(NOT EXISTS "${CMAKE_SOURCE_DIR}/sqlite3.c")
  message(FATAL_ERROR "sqlite3.c not found in source dir (${CMAKE_SOURCE_DIR}). Place sqlite3.c here (amalgamation).")
endif()

add_library(sqlite3 STATIC sqlite3.c)
target_include_directories(sqlite3 PRIVATE ${CMAKE_SOURCE_DIR})
target_compile_definitions(sqlite3 PRIVATE
  SQLITE_ENABLE_FTS5
  SQLITE_ENABLE_FTS4
  SQLITE_ENABLE_FTS3
  SQLITE_ENABLE_JSON1
  SQLITE_ENABLE_RTREE
  SQLITE_THREADSAFE=1
  SQLITE_DEFAULT_FOREIGN_KEYS=1
)
# Ensure sqlite3 static objects are PIC (so they can be linked into .so)
set_target_properties(sqlite3 PROPERTIES POSITION_INDEPENDENT_CODE ON)

# ---- Create the lsqlite3 shared module ----
if(NOT EXISTS "${CMAKE_SOURCE_DIR}/lsqlite3.c")
  message(FATAL_ERROR "lsqlite3.c not found in source dir (${CMAKE_SOURCE_DIR}).")
endif()

add_library(lsqlite3 SHARED lsqlite3.c)
target_include_directories(lsqlite3 PRIVATE
  ${CMAKE_SOURCE_DIR}    # sqlite3.h
  ${LUA_INCLUDE_DIR}     # lua headers
)
set_target_properties(lsqlite3 PROPERTIES POSITION_INDEPENDENT_CODE ON)

# ---- Create imported target for provided lua lib (static .a preferred) ----
# Accept either .a (static) or .so (shared) if user insists.
if(LUA_LIBRARY MATCHES ".*\\.a$")
  add_library(lua_imported STATIC IMPORTED)
  set_target_properties(lua_imported PROPERTIES
    IMPORTED_LOCATION "${LUA_LIBRARY}"
    INTERFACE_INCLUDE_DIRECTORIES "${LUA_INCLUDE_DIR}"
  )
  set(LUA_IMPORT_TARGET lua_imported)
else()
  add_library(lua_imported_shared SHARED IMPORTED)
  set_target_properties(lua_imported_shared PROPERTIES
    IMPORTED_LOCATION "${LUA_LIBRARY}"
    INTERFACE_INCLUDE_DIRECTORIES "${LUA_INCLUDE_DIR}"
  )
  set(LUA_IMPORT_TARGET lua_imported_shared)
endif()

# ---- Link order: static sqlite3 first, then lua (ensures .a is used) ----
target_link_libraries(lsqlite3 PRIVATE
  sqlite3
  ${LUA_IMPORT_TARGET}
  m
  dl
)

# Clean output name
set_target_properties(lsqlite3 PROPERTIES OUTPUT_NAME "lsqlite3")
