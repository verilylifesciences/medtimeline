# Copyright 2018 Verily Life Sciences Inc.
#
# Use of this source code is governed by a BSD-style
# license that can be found in the LICENSE file.
#

# This script runs on JSON files dumped from FHIR to strip out URLs and names
# that we don't necessarily want to check in to source control. It makes
# backups of files before it changes them, then makes the changes in place.
#
# Usage: python strip_info.py <relative path to folder with json files>

import json
import os
import simplejson
import sys

from shutil import copyfile


def main():
    directory = sys.argv[1]
    for filename in os.listdir(directory):
        if filename.endswith(".json"):
            src = directory + '/' + filename
            print "Processing " + src
            copyfile(src, src + "_backup")
            parsed_json = ''
            with open(src, "r") as f:
                # Remove HTTP header
                whole_file_str = f.read()
                # Parse the rest as JSON
                parsed_json = json.loads(whole_file_str)
                # Strip out identifying URLs
                if "link" in parsed_json:
                    for val in parsed_json["link"]:
                        if "url" in val:
                            val["url"] = "https://xxxxxxxx"

                if "entry" in parsed_json:
                  json_entries = parsed_json['entry']
                else:
                  json_entries = parsed_json[0]['entry']

                for entry in json_entries:
                    if "fullUrl" in entry:
                        entry["fullUrl"] = "https://xxxxxxxx"
                    # Strip out names
                    rsc = entry["resource"]
                    if "participant" in rsc:
                        for person in rsc["participant"]:
                            print "!!"
                            if "individual" in person:
                                person["individual"]["display"] = "Participant, Display"
                                print person["individual"]

            with open(src, "w") as f:
                f.write(simplejson.dumps(parsed_json, indent=4, sort_keys=True))


if __name__ == '__main__':
    main()
