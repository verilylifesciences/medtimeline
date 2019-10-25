# Lint as: python3
"""
Copyright 2019 Verily Life Sciences Inc.

Use of this source code is governed by a BSD-style
license that can be found in the LICENSE file.

Validates whether the clinical concepts defined in the listed JSON files
meet the schema for clinical concepts, and whether the hierarchies defined
in them are sane.
"""
import json

from jsonschema import validate
from typing import List

CLINICAL_CONCEPT_SCHEMA_FILE = 'clinical_concept_schema.json'
CLINICAL_CONCEPT_FILES = ['lab_results.json',
                          'vital_signs.json', 'medications.json']
GROUPS_SCHEMA_FILE = 'group_schema.json'
GROUPS_FILES = ['lab_groups.json',
                'vital_sign_groups.json', 'medication_groups.json']
GROUP_NAME_KEY = 'groupName'
GROUP_NAMES_KEY = 'groupNames'


def validate_groups(groups_schema_file: str,
                    groups_files: List[str]) -> (List[str], List[str]):
    """
    Validates the groups file against the schema and prints out
    any errors.

    Args:
        groups_schema_file: The file name of the schema for the group structure
        groups_files: A list of files that contain groups

    Returns:
        A list of group names.
    """
    groups = []
    with open(groups_schema_file) as group_schema:
        schema = json.load(group_schema)

    for file in groups_files:
        with open(file) as data_file:
            data = json.load(data_file)
        for item in data:
            validate(instance=item, schema=schema)
            groups.append(item[GROUP_NAME_KEY])

    return groups


def validate_clinical_concepts(
        clinical_concept_schema_file: str, clinical_concept_files: List[str],
        group_names) -> None:
    """
    Validates clinical concept files.

    Validates the files against the schema, then checks to see that if there
    is a parent group referenced, it is one of the parent groups for
    a concept.

    Args:
        clinical_concept_schema_file: The schema file for clinical concepts.
        clinical_concept_files: The file containing the definition of concepts.
        group_names: Names of defined groups.
    """
    # Validate the concepts schema and check to make sure they don't reference
    # any undefined groups
    with open(clinical_concept_schema_file) as schema_file:
        schema = json.load(schema_file)
    for file in clinical_concept_files:
        with open(file) as data_file:
            data = json.load(data_file)
            for item in data:
                validate(instance=item, schema=schema)
                if GROUP_NAMES_KEY in item:
                    groups = item[GROUP_NAMES_KEY]
                    for group in groups:
                        if group not in group_names:
                            print("ERROR: {} not represented in {}.".format(
                                group, GROUPS_SCHEMA_FILE))


def main():
    # Validate the group schema and make a list of valid groups.
    groups = validate_groups(GROUPS_SCHEMA_FILE, GROUPS_FILES)

    validate_clinical_concepts(CLINICAL_CONCEPT_SCHEMA_FILE,
                               CLINICAL_CONCEPT_FILES, groups)


if __name__ == '__main__':
    main()
