using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Mirror;


[RequireComponent(typeof(PlayerEquipment))]
[RequireComponent(typeof(Player))]
public class WeaponSkills : MonoBehaviour
{
    private Player _player;
    public void OnEquipmentChange(SyncListItemSlot.Operation op, int index, ItemSlot oldSlot, ItemSlot newSlot)
    {
        // note: checking .data is enough. we don't need to check as deep as
        //       .data.model. this way we avoid the EquipmentItem cast.
        ScriptableItem oldItem = oldSlot.amount > 0 ? oldSlot.item.data : null;
        ScriptableItem newItem = newSlot.amount > 0 ? newSlot.item.data : null;

        if (oldItem != newItem)
        {
            // Equipment item change
            if (newItem != null)
            {
                // New item contains data
                var newEquipmentItemData = newItem as WeaponItem; // only one cast
                if (newEquipmentItemData != null)
                {
                    // Clear the SkillBar of existing skills
                    for (int nc = 0; nc < _player.skillbar.slots.Length; nc++)
                    {
                        _player.skillbar.slots[nc].reference = "";
                    }
                    if (newEquipmentItemData.scriptableWeaponSkillList != null)
                    {
                        // Clear the SkillBar of existing skills
                        for (int nc = 0; nc < _player.skillbar.slots.Length; nc++)
                        {
                            _player.skillbar.slots[nc].reference = "";
                        }

                        int skillIndex = 0;
                        // Add each skill from the weaponSkills list to the skillbar
                        foreach (ScriptableSkill skill in newEquipmentItemData.scriptableWeaponSkillList.weaponSkills)
                        {
                            // TODO: Check if player meets skill requirements. If not, don't add skill to Skillbar. 
                            _player.skillbar.slots[skillIndex].reference = skill.name;
                            skillIndex++;
                            Debug.Log(skill.name);
                        }
                    }
                }
            }
            else
            {
                // if item removed and was weapon clear the skillbar
                var oldEquipmentItemData = oldItem as WeaponItem; // only one cast
                if (oldEquipmentItemData != null)
                {
                    // Old item was a weapon was removed from slot but not replaced by another item
                    // Clear the SkillBar of existing skills
                    for (int nc = 0; nc < _player.skillbar.slots.Length; nc++)
                    {
                        _player.skillbar.slots[nc].reference = "";
                    }
                }
            }
        }
    }


    // Start is called before the first frame update
    void Start()
    {
        _player = GetComponent<Player>();
        _player.equipment.slots.Callback += OnEquipmentChange;

        // Get initial skill list
        for (int nc = 0; nc < _player.equipment.slots.Count; nc++)
        {
            ScriptableItem slotItem = _player.equipment.slots[nc].amount > 0 ? _player.equipment.slots[nc].item.data : null;
            // New item contains data
            var newEquipmentItemData = slotItem as WeaponItem; // only one cast
            if (newEquipmentItemData != null)
            {
                if (newEquipmentItemData.scriptableWeaponSkillList != null)
                {
                    // Clear the SkillBar of existing skills
                    for (int nc2 = 0; nc2 < _player.skillbar.slots.Length; nc2++)
                    {
                        _player.skillbar.slots[nc2].reference = "";
                    }

                    int skillIndex = 0;
                    // Add each skill from the weaponSkills list to the skillbar
                    foreach (ScriptableSkill skill in newEquipmentItemData.scriptableWeaponSkillList.weaponSkills)
                    {
                        // TODO: Check if player meets skill requirements. If not, don't add skill to Skillbar. 
                        _player.skillbar.slots[skillIndex].reference = skill.name;
                        skillIndex++;
                        //  Debug.Log(skill.name);
                    }
                }
            }
        }
    }
}
