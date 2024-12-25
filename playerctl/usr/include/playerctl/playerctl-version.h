/*
 * This file is part of playerctl.
 *
 * playerctl is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Lesser General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option)
 * any later version.
 *
 * playerctl is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU Lesser General Public License for
 * more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with playerctl If not, see <http://www.gnu.org/licenses/>.
 *
 * Copyright © 2014, Tony Crisci
 */
#ifndef __PLAYERCTL_VERSION_H__
#define __PLAYERCTL_VERSION_H__

#if !defined(__PLAYERCTL_INSIDE__) && !defined(PLAYERCTL_COMPILATION)
#error "Only <playerctl/playerctl.h> can be included directly."
#endif

/**
 * SECTION:playerctl-version
 * @short_description: Playerctl version checking
 *
 * Playerctl provides macros to check the version of the library at
 * compile-time
 */

/**
 * PLAYERCTL_MAJOR_VERSION:
 *
 * Playerctl major version component
 */
#define PLAYERCTL_MAJOR_VERSION            (2)

/**
 * PLAYERCTL_MINOR_VERSION:
 *
 * Playerctl minor version component
 */
#define PLAYERCTL_MINOR_VERSION            (4)

/**
 * PLAYERCTL_MICRO_VERSION:
 *
 * Playerctl micro version component
 */
#define PLAYERCTL_MICRO_VERSION            (1)

/**
 * PLAYERCTL_VERSION:
 *
 * Playerctl version
 */
#define PLAYERCTL_VERSION                  (2.4.1)

/**
 * PLAYERCTL_VERSION_S:
 *
 * Playerctl version, encoded as a string
 */
#define PLAYERCTL_VERSION_S                  "2.4.1"

#define PLAYERCTL_ENCODE_VERSION(major,minor,micro) \
  ((major) << 24 | (minor) << 16 | (micro) << 8)

/**
 * PLAYERCTL_VERSION_HEX:
 *
 * Playerctl version, encoded as an hexadecimal number, useful for integer
 * comparisons.
 */
#define PLAYERCTL_VERSION_HEX \
  (PLAYERCTL_ENCODE_VERSION (PLAYERCTL_MAJOR_VERSION, PLAYERCTL_MINOR_VERSION, PLAYERCTL_MICRO_VERSION))

#define PLAYERCTL_CHECK_VERSION(major, minor, micro) \
  (PLAYERCTL_MAJOR_VERSION > (major) || \
   (PLAYERCTL_MAJOR_VERSION == (major) && PLAYERCTL_MINOR_VERSION > (minor)) || \
   (PLAYERCTL_MAJOR_VERSION == (major) && PLAYERCTL_MINOR_VERSION == (minor) && \
    PLAYERCTL_MICRO_VERSION >= (micro)))

#endif /* __PLAYERCTL_VERSION_H__ */
